import { ZohoConfig, ZohoAuthTokens } from './types';
import { supabase } from '../supabase/client';

export class ZohoAuthService {
  private config: ZohoConfig;
  private tokens: ZohoAuthTokens | null = null;

  constructor(config: ZohoConfig) {
    this.config = config;
  }

  /**
   * Generate OAuth authorization URL
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scope,
      response_type: 'code',
      access_type: 'offline',
      prompt: 'consent',
      ...(state && { state })
    });

    return `https://accounts.zoho.com/oauth/v2/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string): Promise<ZohoAuthTokens> {
    try {
      const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          redirect_uri: this.config.redirectUri,
          code: code,
        }),
      });

      if (!response.ok) {
        throw new Error(`OAuth token exchange failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      const tokens: ZohoAuthTokens = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: Date.now() + (data.expires_in * 1000),
        tokenType: 'Bearer'
      };

      // Store tokens securely
      await this.storeTokens(tokens);
      this.tokens = tokens;

      return tokens;
    } catch (error) {
      console.error('Error exchanging code for tokens:', error);
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<ZohoAuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await fetch('https://accounts.zoho.com/oauth/v2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: this.tokens.refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error(`Token refresh failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      const newTokens: ZohoAuthTokens = {
        accessToken: data.access_token,
        refreshToken: this.tokens.refreshToken, // Keep existing refresh token
        expiresAt: Date.now() + (data.expires_in * 1000),
        tokenType: 'Bearer'
      };

      await this.storeTokens(newTokens);
      this.tokens = newTokens;

      return newTokens;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  /**
   * Get valid access token (refresh if needed)
   */
  async getValidAccessToken(): Promise<string> {
    if (!this.tokens) {
      await this.loadTokens();
    }

    if (!this.tokens) {
      throw new Error('No authentication tokens found. Please re-authenticate.');
    }

    // Check if token is expired (with 5-minute buffer)
    if (Date.now() >= (this.tokens.expiresAt - 300000)) {
      console.log('Access token expired, refreshing...');
      await this.refreshAccessToken();
    }

    return this.tokens.accessToken;
  }

  /**
   * Store tokens securely in database
   */
  private async storeTokens(tokens: ZohoAuthTokens): Promise<void> {
    try {
      const { error } = await supabase
        .from('integration_tokens')
        .upsert({
          integration_name: 'zoho_people',
          access_token: tokens.accessToken,
          refresh_token: tokens.refreshToken,
          expires_at: new Date(tokens.expiresAt).toISOString(),
          token_type: tokens.tokenType,
          updated_at: new Date().toISOString()
        });

      if (error) {
        throw new Error(`Failed to store tokens: ${error.message}`);
      }
    } catch (error) {
      console.error('Error storing tokens:', error);
      throw error;
    }
  }

  /**
   * Load tokens from database
   */
  private async loadTokens(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('integration_tokens')
        .select('*')
        .eq('integration_name', 'zoho_people')
        .single();

      if (error) {
        throw new Error(`Failed to load tokens: ${error.message}`);
      }

      if (data) {
        this.tokens = {
          accessToken: data.access_token,
          refreshToken: data.refresh_token,
          expiresAt: new Date(data.expires_at).getTime(),
          tokenType: data.token_type
        };
      }
    } catch (error) {
      console.error('Error loading tokens:', error);
      throw error;
    }
  }

  /**
   * Revoke tokens and clear from storage
   */
  async revokeTokens(): Promise<void> {
    if (this.tokens?.refreshToken) {
      try {
        await fetch('https://accounts.zoho.com/oauth/v2/token/revoke', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            token: this.tokens.refreshToken,
          }),
        });
      } catch (error) {
        console.error('Error revoking tokens:', error);
      }
    }

    // Clear from database
    await supabase
      .from('integration_tokens')
      .delete()
      .eq('integration_name', 'zoho_people');

    this.tokens = null;
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      if (!this.tokens) {
        await this.loadTokens();
      }
      return !!this.tokens;
    } catch {
      return false;
    }
  }

  /**
   * Get authentication status
   */
  async getAuthStatus(): Promise<{
    authenticated: boolean;
    expiresAt?: number;
    needsRefresh: boolean;
  }> {
    try {
      if (!this.tokens) {
        await this.loadTokens();
      }

      if (!this.tokens) {
        return { authenticated: false, needsRefresh: false };
      }

      const needsRefresh = Date.now() >= (this.tokens.expiresAt - 300000);
      
      return {
        authenticated: true,
        expiresAt: this.tokens.expiresAt,
        needsRefresh
      };
    } catch {
      return { authenticated: false, needsRefresh: false };
    }
  }
}
