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

interface ReleasePayload {
  tag_name: string;
  name: string | null;
  body: string | null;
  html_url: string;
  draft?: boolean;
  prerelease?: boolean;
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

function isReleaseEvent(context: typeof github.context): boolean {
  return context.eventName === 'release' && context.payload.release !== undefined;
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) {
    return text;
  }

  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');

  if (lastSpace > 0) {
    return truncated.substring(0, lastSpace) + '...';
  }

  return truncated + '...';
}

function buildEmbed(inputs: Record<string, string>): DiscordEmbed {
  const { context } = github;
  const isRelease = isReleaseEvent(context);
  const release = isRelease ? (context.payload.release as ReleasePayload) : null;

  const repoFullName = `${context.repo.owner}/${context.repo.repo}`;
  const repoUrl = `https://github.com/${repoFullName}`;
  const commitUrl = `${repoUrl}/commit/${context.sha}`;
  const branchName = getBranchName(context.ref);
  const shortSha = context.sha.substring(0, 7);

  let title: string;
  let url: string;

  if (isRelease && release) {
    const releaseName = release.name || release.tag_name;
    title = `Release ${release.tag_name}: ${releaseName}`;
    url = release.html_url;
  } else {
    title = repoFullName;
    url = repoUrl;
  }

  const fields: Array<{ name: string; value: string; inline: boolean }> = [];

  if (isRelease && release) {
    // For release events: show Repository and Version
    fields.push({
      name: '📦 Repository',
      value: `[${repoFullName}](${repoUrl})`,
      inline: true,
    });
    fields.push({
      name: '🏷️ Version',
      value: release.tag_name,
      inline: true,
    });
  } else {
    // For non-release events: show Repository, Branch, Commit (original behavior)
    fields.push({
      name: '📦 Repository',
      value: `[${repoFullName}](${repoUrl})`,
      inline: true,
    });
    fields.push({
      name: '🌿 Branch',
      value: branchName,
      inline: true,
    });
    fields.push({
      name: '🔗 Commit',
      value: `[\`${shortSha}\`](${commitUrl})`,
      inline: true,
    });
  }

  // Add release notes if available
  if (isRelease && release && release.body) {
    const truncatedBody = truncateText(release.body, 300);
    fields.unshift({
      name: '📝 Release Notes',
      value: `${truncatedBody}\n\n[Read more →](${release.html_url})`,
      inline: false,
    });
  }

  return {
    title,
    url,
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
    const username = core.getInput('username') || 'GitHub Release';
    const avatarUrl =
      core.getInput('avatar_url') ||
      'https://emoji-cdn.mqrio.dev/%F0%9F%93%A6?style=microsoft-3D-fluent';
    const content = core.getInput('content') || 'A new release is now available!';
    const footer = core.getInput('footer') || 'Powered by Lettermint · lettermint.co';

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

    if (isReleaseEvent(github.context)) {
      const release = github.context.payload.release as ReleasePayload;
      core.info(`Release Event Detected: ${release.tag_name}`);
      core.info(`Release Name: ${release.name || 'N/A'}`);
      core.info(`Repository: ${github.context.repo.owner}/${github.context.repo.repo}`);
    } else {
      core.info(`Repository: ${github.context.repo.owner}/${github.context.repo.repo}`);
      core.info(`Branch: ${getBranchName(github.context.ref)}`);
      core.info(`Commit: ${github.context.sha.substring(0, 7)}`);
    }

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
