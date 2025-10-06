import { createClient } from '@/integrations/supabase/client';

export interface OAuthProvider {
  id: string;
  name: string;
  icon: string;
  enabled: boolean;
  clientId: string;
  redirectUri: string;
  scope: string[];
}

export interface OAuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  provider: string;
  providerId: string;
}

export class OAuthService {
  private supabase = createClient();
  
  // OAuth provider configurations
  private readonly providers: Record<string, OAuthProvider> = {
    google: {
      id: 'google',
      name: 'Google',
      icon: 'google',
      enabled: true,
      clientId: process.env.VITE_GOOGLE_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/auth/callback`,
      scope: ['openid', 'email', 'profile']
    },
    microsoft: {
      id: 'microsoft',
      name: 'Microsoft',
      icon: 'microsoft',
      enabled: true,
      clientId: process.env.VITE_MICROSOFT_CLIENT_ID || '',
      redirectUri: `${window.location.origin}/auth/callback`,
      scope: ['openid', 'email', 'profile']
    }
  };

  /**
   * Get available OAuth providers
   */
  getAvailableProviders(): OAuthProvider[] {
    return Object.values(this.providers).filter(provider => provider.enabled);
  }

  /**
   * Initiate OAuth login with specified provider
   */
  async initiateOAuthLogin(providerId: string): Promise<{ url: string }> {
    const provider = this.providers[providerId];
    
    if (!provider) {
      throw new Error(`OAuth provider '${providerId}' not found`);
    }

    if (!provider.enabled) {
      throw new Error(`OAuth provider '${providerId}' is disabled`);
    }

    try {
      let authUrl: string;

      switch (providerId) {
        case 'google':
          authUrl = await this.getGoogleAuthUrl(provider);
          break;
        case 'microsoft':
          authUrl = await this.getMicrosoftAuthUrl(provider);
          break;
        default:
          throw new Error(`OAuth provider '${providerId}' not supported`);
      }

      return { url: authUrl };
    } catch (error) {
      console.error(`OAuth login initiation failed for ${providerId}:`, error);
      throw new Error(`Failed to initiate OAuth login with ${provider.name}`);
    }
  }

  /**
   * Handle OAuth callback and create/update user
   */
  async handleOAuthCallback(
    providerId: string, 
    code: string, 
    state?: string
  ): Promise<OAuthUser> {
    try {
      let userData: OAuthUser;

      switch (providerId) {
        case 'google':
          userData = await this.handleGoogleCallback(code);
          break;
        case 'microsoft':
          userData = await this.handleMicrosoftCallback(code);
          break;
        default:
          throw new Error(`OAuth provider '${providerId}' not supported`);
      }

      // Create or update user in database
      await this.createOrUpdateUser(userData);

      return userData;
    } catch (error) {
      console.error(`OAuth callback handling failed for ${providerId}:`, error);
      throw new Error(`Failed to complete OAuth login with ${this.providers[providerId]?.name}`);
    }
  }

  /**
   * Get Google OAuth URL
   */
  private async getGoogleAuthUrl(provider: OAuthProvider): Promise<string> {
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      response_type: 'code',
      scope: provider.scope.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state: this.generateState()
    });

    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  }

  /**
   * Get Microsoft OAuth URL
   */
  private async getMicrosoftAuthUrl(provider: OAuthProvider): Promise<string> {
    const params = new URLSearchParams({
      client_id: provider.clientId,
      redirect_uri: provider.redirectUri,
      response_type: 'code',
      scope: provider.scope.join(' '),
      response_mode: 'query',
      state: this.generateState()
    });

    return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Handle Google OAuth callback
   */
  private async handleGoogleCallback(code: string): Promise<OAuthUser> {
    // Exchange code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.providers.google.clientId,
        client_secret: process.env.VITE_GOOGLE_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.providers.google.redirectUri,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user information from Google');
    }

    const userInfo = await userResponse.json();

    return {
      id: userInfo.id,
      email: userInfo.email,
      firstName: userInfo.given_name,
      lastName: userInfo.family_name,
      avatar: userInfo.picture,
      provider: 'google',
      providerId: userInfo.id
    };
  }

  /**
   * Handle Microsoft OAuth callback
   */
  private async handleMicrosoftCallback(code: string): Promise<OAuthUser> {
    // Exchange code for access token
    const tokenResponse = await fetch('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.providers.microsoft.clientId,
        client_secret: process.env.VITE_MICROSOFT_CLIENT_SECRET || '',
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.providers.microsoft.redirectUri,
        scope: this.providers.microsoft.scope.join(' '),
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange code for access token');
    }

    const tokenData = await tokenResponse.json();
    const accessToken = tokenData.access_token;

    // Get user info from Microsoft Graph
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user information from Microsoft');
    }

    const userInfo = await userResponse.json();

    return {
      id: userInfo.id,
      email: userInfo.mail || userInfo.userPrincipalName,
      firstName: userInfo.givenName,
      lastName: userInfo.surname,
      avatar: userInfo.photo?.value,
      provider: 'microsoft',
      providerId: userInfo.id
    };
  }

  /**
   * Create or update user in database
   */
  private async createOrUpdateUser(oauthUser: OAuthUser): Promise<void> {
    try {
      // Check if user already exists
      const { data: existingUser } = await this.supabase
        .from('users')
        .select('*')
        .eq('email', oauthUser.email)
        .single();

      if (existingUser) {
        // Update existing user
        await this.supabase
          .from('users')
          .update({
            first_name: oauthUser.firstName,
            last_name: oauthUser.lastName,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingUser.id);
      } else {
        // Create new user
        await this.supabase
          .from('users')
          .insert({
            email: oauthUser.email,
            first_name: oauthUser.firstName,
            last_name: oauthUser.lastName,
            role: 'employee', // Default role for OAuth users
            is_active: true,
            two_factor_enabled: false,
            session_timeout: 480,
            permissions: [],
            restrictions: []
          });
      }
    } catch (error) {
      console.error('Failed to create/update user:', error);
      throw new Error('Failed to create user account');
    }
  }

  /**
   * Generate random state parameter for OAuth
   */
  private generateState(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let state = '';
    for (let i = 0; i < 32; i++) {
      state += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return state;
  }

  /**
   * Disconnect OAuth provider
   */
  async disconnectProvider(userId: string, providerId: string): Promise<void> {
    try {
      // In a real implementation, you would revoke the OAuth token
      // and remove the provider association from the user's account
      console.log(`Disconnecting ${providerId} for user ${userId}`);
    } catch (error) {
      console.error(`Failed to disconnect ${providerId}:`, error);
      throw new Error(`Failed to disconnect ${providerId}`);
    }
  }

  /**
   * Get user's connected providers
   */
  async getConnectedProviders(userId: string): Promise<string[]> {
    try {
      // In a real implementation, you would check which providers
      // the user has connected to their account
      return [];
    } catch (error) {
      console.error('Failed to get connected providers:', error);
      return [];
    }
  }
}

// Export singleton instance
export const oauthService = new OAuthService();
