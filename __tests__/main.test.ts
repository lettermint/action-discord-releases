import * as core from '@actions/core';
import * as github from '@actions/github';

jest.mock('@actions/core');
jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'lettermint',
      repo: 'test-repo',
    },
    sha: 'abc123def456789',
    ref: 'refs/heads/main',
  },
}));

global.fetch = jest.fn();

describe('Discord Webhook Action', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (core.getInput as jest.Mock).mockImplementation((name: string) => {
      const inputs: Record<string, string> = {
        webhook_url: 'https://discord.com/api/webhooks/123/abc',
        color: '8892be',
        username: 'Release Changelog',
        avatar_url: 'https://cdn.discordapp.com/avatars/test.png',
        content: 'A new release is now available!',
        footer: 'Delivered by Lettermint | lettermint.co',
      };
      return inputs[name] || '';
    });
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      text: async () => '',
    });
  });

  test('hex to decimal conversion', () => {
    function hexToDecimal(hex: string): number {
      const cleanHex = hex.replace('#', '');
      return parseInt(cleanHex, 16);
    }

    expect(hexToDecimal('8892be')).toBe(8950462);
    expect(hexToDecimal('#8892be')).toBe(8950462);
    expect(hexToDecimal('00ff00')).toBe(65280);
    expect(hexToDecimal('ffffff')).toBe(16777215);
    expect(hexToDecimal('000000')).toBe(0);
  });

  test('branch name extraction from refs/heads/', () => {
    function getBranchName(ref: string): string {
      if (ref.startsWith('refs/heads/')) {
        return ref.replace('refs/heads/', '');
      }
      if (ref.startsWith('refs/tags/')) {
        return ref.replace('refs/tags/', '');
      }
      return ref;
    }

    expect(getBranchName('refs/heads/main')).toBe('main');
    expect(getBranchName('refs/heads/feature/test')).toBe('feature/test');
    expect(getBranchName('refs/tags/v1.0.0')).toBe('v1.0.0');
    expect(getBranchName('custom-ref')).toBe('custom-ref');
  });

  test('builds correct Discord embed structure', () => {
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

    const inputs = {
      color: '8892be',
      footer: 'Test Footer',
    };

    const { context } = github;
    const repoFullName = `${context.repo.owner}/${context.repo.repo}`;
    const repoUrl = `https://github.com/${repoFullName}`;
    const commitUrl = `${repoUrl}/commit/${context.sha}`;
    const branchName = getBranchName(context.ref);
    const shortSha = context.sha.substring(0, 7);

    const embed = {
      title: repoFullName,
      url: repoUrl,
      color: hexToDecimal(inputs.color),
      timestamp: new Date().toISOString(),
      fields: [
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
      ],
      footer: {
        text: inputs.footer,
      },
    };

    expect(embed.title).toBe('lettermint/test-repo');
    expect(embed.url).toBe('https://github.com/lettermint/test-repo');
    expect(embed.color).toBe(8950462);
    expect(embed.fields).toHaveLength(3);
    expect(embed.fields[0].name).toBe('📦 Repository');
    expect(embed.fields[1].name).toBe('🌿 Branch');
    expect(embed.fields[1].value).toBe('main');
    expect(embed.fields[2].name).toBe('🔗 Commit');
    expect(embed.fields[2].value).toBe(
      '[`abc123d`](https://github.com/lettermint/test-repo/commit/abc123def456789)'
    );
    expect(embed.footer.text).toBe('Test Footer');
  });

  test('validates Discord webhook URL', () => {
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

    expect(() => validateWebhookUrl('https://discord.com/api/webhooks/123/abc')).not.toThrow();
    expect(() => validateWebhookUrl('https://discordapp.com/api/webhooks/123/abc')).not.toThrow();
    expect(() => validateWebhookUrl('https://example.com/webhook')).toThrow(
      'Webhook URL must be a Discord webhook URL'
    );
    expect(() => validateWebhookUrl('not-a-url')).toThrow('Invalid webhook URL');
  });

  test('sends webhook successfully', async () => {
    const webhookUrl = 'https://discord.com/api/webhooks/123/abc';
    const payload = {
      username: 'Test Bot',
      content: 'Test message',
      embeds: [],
    };

    async function sendWebhook(url: string, data: typeof payload): Promise<void> {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Discord webhook failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }
    }

    await expect(sendWebhook(webhookUrl, payload)).resolves.not.toThrow();

    expect(global.fetch).toHaveBeenCalledWith(
      webhookUrl,
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })
    );
  });

  test('handles webhook errors gracefully', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      text: async () => 'Invalid payload',
    });

    const webhookUrl = 'https://discord.com/api/webhooks/123/abc';
    const payload = {
      username: 'Test Bot',
      content: 'Test message',
      embeds: [],
    };

    async function sendWebhook(url: string, data: typeof payload): Promise<void> {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Discord webhook failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }
    }

    await expect(sendWebhook(webhookUrl, payload)).rejects.toThrow(
      'Discord webhook failed: 400 Bad Request. Invalid payload'
    );
  });

  test('handles rate limiting (429)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 429,
      statusText: 'Too Many Requests',
      text: async () => 'Rate limited',
    });

    const webhookUrl = 'https://discord.com/api/webhooks/123/abc';
    const payload = {
      username: 'Test Bot',
      content: 'Test message',
      embeds: [],
    };

    async function sendWebhook(url: string, data: typeof payload): Promise<void> {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Discord webhook failed: ${response.status} ${response.statusText}. ${errorText}`
        );
      }
    }

    await expect(sendWebhook(webhookUrl, payload)).rejects.toThrow(
      'Discord webhook failed: 429 Too Many Requests. Rate limited'
    );
  });
});
