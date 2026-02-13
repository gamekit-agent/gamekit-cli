using System;
using System.Collections.Generic;
using System.Threading;
using GameKit.Models;
using UnityEditor;
using UnityEngine;

namespace GameKit.Services
{
    public static class LogService
    {
        private static readonly LogEntry[] _buffer = new LogEntry[2000];
        private static int _writeIndex;
        private static int _totalCount;
        private static long _sequence;
        private static readonly List<Action<LogEntry>> _listeners = new List<Action<LogEntry>>();

        [InitializeOnLoadMethod]
        private static void Init()
        {
            Application.logMessageReceived += OnLogReceived;
        }

        private static void OnLogReceived(string message, string stackTrace, LogType type)
        {
            var entry = new LogEntry
            {
                message = message,
                stackTrace = (type == LogType.Exception || type == LogType.Error || type == LogType.Assert)
                    ? stackTrace
                    : null,
                severity = MapSeverity(type),
                mode = EditorApplication.isPlaying ? "play" : "edit",
                timestamp = DateTime.UtcNow.ToString("o"),
                sequence = Interlocked.Increment(ref _sequence)
            };

            _buffer[_writeIndex % _buffer.Length] = entry;
            _writeIndex++;
            _totalCount++;

            Action<LogEntry>[] snapshot;
            lock (_listeners)
            {
                snapshot = _listeners.ToArray();
            }

            foreach (var listener in snapshot)
            {
                try
                {
                    listener(entry);
                }
                catch (Exception)
                {
                    // Listener errors should not break log capture
                }
            }
        }

        private static string MapSeverity(LogType type)
        {
            switch (type)
            {
                case LogType.Error:
                case LogType.Exception:
                case LogType.Assert:
                    return "error";
                case LogType.Warning:
                    return "warning";
                default:
                    return "info";
            }
        }

        public static LogQueryResult GetEntries(string severityFilter = null, int limit = 0)
        {
            var entries = new List<LogEntry>();

            int count = Math.Min(_totalCount, _buffer.Length);
            int start = _totalCount > _buffer.Length ? _writeIndex : 0;

            for (int i = 0; i < count; i++)
            {
                var entry = _buffer[(start + i) % _buffer.Length];
                if (entry == null) continue;

                if (severityFilter != null && entry.severity != severityFilter)
                    continue;

                entries.Add(entry);
            }

            int filteredCount = entries.Count;

            // When limit is set, return only the most recent N entries
            if (limit > 0 && entries.Count > limit)
            {
                entries = entries.GetRange(entries.Count - limit, limit);
            }

            int droppedCount = _totalCount > _buffer.Length ? _totalCount - _buffer.Length : 0;

            return new LogQueryResult
            {
                entries = entries,
                totalCount = _totalCount,
                filteredCount = filteredCount,
                droppedCount = droppedCount
            };
        }

        public static void AddListener(Action<LogEntry> listener)
        {
            lock (_listeners)
            {
                _listeners.Add(listener);
            }
        }

        public static void RemoveListener(Action<LogEntry> listener)
        {
            lock (_listeners)
            {
                _listeners.Remove(listener);
            }
        }

        public static void Clear()
        {
            for (int i = 0; i < _buffer.Length; i++)
                _buffer[i] = null;

            _writeIndex = 0;
            _totalCount = 0;
            // _sequence is monotonic -- never reset
        }
    }

    public class LogQueryResult
    {
        public List<LogEntry> entries;
        public int totalCount;
        public int filteredCount;
        public int droppedCount;
    }
}
