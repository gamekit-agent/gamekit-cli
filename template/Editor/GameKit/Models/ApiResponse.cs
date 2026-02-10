using Newtonsoft.Json;

namespace GameKit.Models
{
    public class ApiResponse
    {
        [JsonProperty("success")]
        public bool success;

        [JsonProperty("data")]
        public object data;

        [JsonProperty("error")]
        public ApiError error;

        public static ApiResponse Success(object data)
        {
            return new ApiResponse
            {
                success = true,
                data = data,
                error = null
            };
        }

        public static ApiResponse Error(string code, string message)
        {
            return new ApiResponse
            {
                success = false,
                data = null,
                error = new ApiError
                {
                    code = code,
                    message = message
                }
            };
        }
    }

    public class ApiError
    {
        [JsonProperty("code")]
        public string code;

        [JsonProperty("message")]
        public string message;
    }
}
