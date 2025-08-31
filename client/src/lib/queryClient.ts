import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  url: string,
  method: string,
  data?: unknown | undefined,
): Promise<any> {
  console.log(`Making API request: ${url} ${method}`);
  
  const headers: Record<string, string> = {};
  if (data && !(data instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  
  const options: RequestInit = {
    method,
    headers,
    credentials: "include", // Important for sending cookies with cross-origin requests
  };
  
  if (data) {
    if (data instanceof FormData) {
      options.body = data;
    } else {
      options.body = JSON.stringify(data);
    }
  }
  
  const res = await fetch(url, options);
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error(`API error (${res.status}): ${errorText}`);
    throw new Error(errorText || res.statusText || `${res.status} error`);
  }
  
  return await res.json();
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    console.log(`Making query for: ${queryKey[0]}`);
    try {
      const res = await fetch(queryKey[0] as string, {
        credentials: "include",
      });

      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        console.log(`Unauthorized request: ${queryKey[0]}, returning null as configured`);
        return null;
      }

      if (!res.ok) {
        const text = await res.text();
        const errorMessage = `${res.status}: ${text || res.statusText}`;
        console.error(`Query error: ${errorMessage}`);
        
        if (res.status === 401 && unauthorizedBehavior !== "returnNull") {
          console.error("Authentication error - user may need to log in");
        }
        
        throw new Error(errorMessage);
      }
      
      return await res.json();
    } catch (error) {
      console.error(`Query error for ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
