interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  provider: "google" | "github" | "linkedin";
}

export async function getOAuthUrl(config: OAuthConfig, origin: string): Promise<string> {
  const scopes =
    config.provider === "google"
      ? "openid email profile"
      : config.provider === "github"
        ? "user:email"
        : "r_basicprofile r_emailaddress";

  return `https://${config.provider}.com/oauth/authorize?client_id=${config.clientId}&redirect_uri=${encodeURIComponent(origin + "/auth/callback")}&response_type=code&scope=${encodeURIComponent(scopes)}`;
}

export async function exchangeCodeForToken(
  code: string,
): Promise<{ accessToken: string; refreshToken?: string }> {
  // Simulated token exchange
  return { accessToken: `token_${code}` };
}
