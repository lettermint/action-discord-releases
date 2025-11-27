import * as core from '@actions/core';
import * as github from '@actions/github';

interface DiscordEmbed {
  title?: string;
  url?: string;
  color?: number;
  timestamp?: string;
  footer?: {
    text: string;
    icon_url?: string;
  };
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
}

interface DiscordPayload {
  username?: string;
  avatar_url?: string;
  content?: string;
  embeds: DiscordEmbed[];
}

function hexToDecimal(hex: string): number {
  const cleanHex = hex.replace('#', '');
  return parseInt(cleanHex, 16);
}

function getBranchName(ref: string): string {
  if (ref.startsWith('refs/heads/')) {
    return ref.replace('refs/heads/', '');
  }
  if (ref.startsWith('refs/tags/')) {
    return ref.replace('refs/tags/', '');
  }
  return ref;
}

function buildEmbed(inputs: Record<string, string>): DiscordEmbed {
  const { context } = github;
  const repoFullName = `${context.repo.owner}/${context.repo.repo}`;
  const repoUrl = `https://github.com/${repoFullName}`;
  const commitUrl = `${repoUrl}/commit/${context.sha}`;
  const branchName = getBranchName(context.ref);
  const shortSha = context.sha.substring(0, 7);

  const fields: Array<{ name: string; value: string; inline: boolean }> = [
    {
      name: '📦 Repository',
      value: `[${repoFullName}](${repoUrl})`,
      inline: true,
    },
    {
      name: '🌿 Branch',
      value: branchName,
      inline: true,
    },
    {
      name: '🔗 Commit',
      value: `[\`${shortSha}\`](${commitUrl})`,
      inline: true,
    },
  ];

  return {
    title: repoFullName,
    url: repoUrl,
    color: hexToDecimal(inputs.color),
    timestamp: new Date().toISOString(),
    fields,
    footer: {
      text: inputs.footer,
    },
  };
}

async function sendWebhook(webhookUrl: string, payload: DiscordPayload): Promise<void> {
  const response = await fetch(webhookUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `Discord webhook failed: ${response.status} ${response.statusText}. ${errorText}`
    );
  }

  core.info('Discord webhook sent successfully');
}

function validateWebhookUrl(url: string): void {
  try {
    const parsedUrl = new URL(url);
    if (
      !parsedUrl.hostname.includes('discord.com') &&
      !parsedUrl.hostname.includes('discordapp.com')
    ) {
      throw new Error('Webhook URL must be a Discord webhook URL');
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Invalid webhook URL: ${error.message}`);
    }
    throw new Error('Invalid webhook URL');
  }
}

async function run(): Promise<void> {
  try {
    const webhookUrl = core.getInput('webhook_url', { required: true });
    const color = core.getInput('color') || '8892be';
    const username = core.getInput('username') || 'Release Changelog';
    const avatarUrl =
      core.getInput('avatar_url') ||
      'https://cdn.jsdelivr.net/gh/twitter/twemoji@latest/assets/72x72/1f4e6.png';
    const content = core.getInput('content') || 'A new release is now available!';
    const footer = core.getInput('footer') || 'Powered by [Lettermint](https://lettermint.co)';

    validateWebhookUrl(webhookUrl);

    const inputs = {
      color,
      footer,
    };

    const embed = buildEmbed(inputs);

    const payload: DiscordPayload = {
      username,
      avatar_url: avatarUrl,
      content,
      embeds: [embed],
    };

    core.info('Sending Discord webhook...');
    core.info(`Repository: ${github.context.repo.owner}/${github.context.repo.repo}`);
    core.info(`Branch: ${getBranchName(github.context.ref)}`);
    core.info(`Commit: ${github.context.sha.substring(0, 7)}`);

    await sendWebhook(webhookUrl, payload);

    core.setOutput('success', 'true');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(`Action failed: ${error.message}`);
    } else {
      core.setFailed('Action failed with unknown error');
    }
  }
}

run();
