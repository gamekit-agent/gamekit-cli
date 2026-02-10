using Newtonsoft.Json;

namespace GameKit.Models
{
    public class LogEntry
    {
        [JsonProperty("message")]
        public string message;

        [JsonProperty("stackTrace")]
        public string stackTrace;

        [JsonProperty("severity")]
        public string severity;

        [JsonProperty("mode")]
        public string mode;

        [JsonProperty("timestamp")]
        public string timestamp;

        [JsonProperty("sequence")]
        public long sequence;
    }
}
