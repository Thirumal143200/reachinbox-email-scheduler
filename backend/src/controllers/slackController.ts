import { Request, Response } from 'express';
import { WebClient } from '@slack/web-api';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { encryptToken } from '../utils/encryption.js';
import { logger } from '../utils/logger.js';

export const slackController = {
  /**
   * Redirects user to Slack OAuth authorization page
   */
  connect(req: Request, res: Response) {
    if (!config.slack.clientId) {
      return res.status(400).json({
        error: 'Slack credentials not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET.',
      });
    }

    const scopes = ['chat:write', 'chat:write.public', 'incoming-webhook'].join(',');
    const userId = (req as any).user?.id || req.headers['x-user-id'] || 'default-demo-user';
    const state = Buffer.from(JSON.stringify({ userId, timestamp: Date.now() })).toString('base64');

    const slackAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${config.slack.clientId}&scope=${encodeURIComponent(
      scopes
    )}&redirect_uri=${encodeURIComponent(config.slack.redirectUri)}&state=${state}`;

    return res.redirect(slackAuthUrl);
  },

  /**
   * Slack OAuth callback: exchanges authorization code for bot access token and stores securely
   */
  async callback(req: Request, res: Response) {
    const { code, state, error } = req.query;

    if (error) {
      logger.warn({ error }, 'User declined Slack OAuth authorization');
      return res.redirect(`${config.frontendUrl}/?slack=error&message=${encodeURIComponent(String(error))}`);
    }

    if (!code) {
      return res.redirect(`${config.frontendUrl}/?slack=error&message=No+code+provided`);
    }

    try {
      let resolvedUserId = 'default-demo-user';
      if (state) {
        try {
          const parsedState = JSON.parse(Buffer.from(String(state), 'base64').toString('utf8'));
          if (parsedState.userId) resolvedUserId = parsedState.userId;
        } catch {
          // ignore parsing error
        }
      }

      if ((req as any).user?.id) {
        resolvedUserId = (req as any).user.id;
      }

      const client = new WebClient();
      const response: any = await client.oauth.v2.access({
        client_id: config.slack.clientId,
        client_secret: config.slack.clientSecret,
        code: String(code),
        redirect_uri: config.slack.redirectUri,
      });

      if (!response.ok) {
        logger.error({ error: response.error }, 'Slack OAuth access exchange failed');
        return res.redirect(
          `${config.frontendUrl}/?slack=error&message=${encodeURIComponent(response.error || 'Slack exchange failed')}`
        );
      }

      const accessToken = response.access_token;
      const teamId = response.team?.id;
      const teamName = response.team?.name;
      const slackUserId = response.authed_user?.id;
      const channelId = response.incoming_webhook?.channel_id || response.incoming_webhook?.channel || null;

      const encrypted = encryptToken(accessToken);

      // Store or update SlackConnection in PostgreSQL
      await prisma.slackConnection.upsert({
        where: { userId: resolvedUserId },
        update: {
          slackTeamId: teamId,
          slackTeamName: teamName,
          slackUserId,
          slackChannelId: channelId,
          encryptedAccessToken: encrypted,
          status: 'CONNECTED',
        },
        create: {
          userId: resolvedUserId,
          slackTeamId: teamId,
          slackTeamName: teamName,
          slackUserId,
          slackChannelId: channelId,
          encryptedAccessToken: encrypted,
          status: 'CONNECTED',
        },
      });

      logger.info({ userId: resolvedUserId, teamName }, 'Slack connected successfully');
      return res.redirect(`${config.frontendUrl}/?slack=connected&team=${encodeURIComponent(teamName || '')}`);
    } catch (err: any) {
      logger.error({ err: err.message }, 'Unexpected error in Slack callback');
      return res.redirect(`${config.frontendUrl}/?slack=error&message=Unexpected+error`);
    }
  },

  /**
   * Retrieves Slack connection status for the user
   */
  async getStatus(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'] || 'default-demo-user';
      const connection = await prisma.slackConnection.findUnique({
        where: { userId: String(userId) },
      });

      if (!connection || connection.status !== 'CONNECTED') {
        return res.json({ connected: false });
      }

      return res.json({
        connected: true,
        teamName: connection.slackTeamName,
        teamId: connection.slackTeamId,
        channel: connection.slackChannelId,
        connectedAt: connection.updatedAt,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to get Slack status');
      return res.status(500).json({ error: 'Failed to retrieve Slack status' });
    }
  },

  /**
   * Disconnects the user's Slack workspace
   */
  async disconnect(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'] || 'default-demo-user';
      await prisma.slackConnection.updateMany({
        where: { userId: String(userId) },
        data: { status: 'DISCONNECTED' },
      });

      logger.info({ userId }, 'Slack workspace disconnected');
      return res.json({ message: 'Slack disconnected successfully', connected: false });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to disconnect Slack');
      return res.status(500).json({ error: 'Failed to disconnect Slack' });
    }
  },
};
