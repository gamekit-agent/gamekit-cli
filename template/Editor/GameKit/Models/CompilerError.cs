using Newtonsoft.Json;

namespace GameKit.Models
{
    public class CompilerError
    {
        [JsonProperty("file")]
        public string file;

        [JsonProperty("line")]
        public int line;

        [JsonProperty("column")]
        public int column;

        [JsonProperty("message")]
        public string message;

        [JsonProperty("severity")]
        public string severity;
    }
}
