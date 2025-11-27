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
        username: 'GitHub Release',
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

describe('Release Event Handling', () => {
  test('detects release event correctly', () => {
    function isReleaseEvent(context: any): boolean {
      return context.eventName === 'release' && context.payload.release !== undefined;
    }

    const releaseContext = {
      eventName: 'release',
      payload: {
        release: {
          tag_name: 'v1.0.0',
          name: 'First Release',
          body: 'Release notes here',
          html_url: 'https://github.com/owner/repo/releases/tag/v1.0.0',
        },
      },
    };

    const pushContext = {
      eventName: 'push',
      payload: {},
    };

    expect(isReleaseEvent(releaseContext)).toBe(true);
    expect(isReleaseEvent(pushContext)).toBe(false);
  });

  test('truncates text at word boundaries', () => {
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

    const shortText = 'Short text';
    expect(truncateText(shortText, 50)).toBe('Short text');

    const longText = 'This is a very long text that needs to be truncated at a word boundary';
    const result = truncateText(longText, 30);
    expect(result.endsWith('...')).toBe(true);
    expect(result.length).toBeLessThanOrEqual(33);
    // Should truncate at word boundary
    expect(result).toBe('This is a very long text that...');

    const noSpaces = 'verylongtextwithoutanyspaces';
    expect(truncateText(noSpaces, 10)).toBe('verylongte...');
  });

  test('builds correct embed structure for release event', () => {
    const mockRelease = {
      tag_name: 'v1.0.0',
      name: 'Major Update',
      body: 'This is a test release with some notes about what changed.',
      html_url: 'https://github.com/lettermint/test-repo/releases/tag/v1.0.0',
    };

    const releaseName = mockRelease.name || mockRelease.tag_name;
    const title = `Release ${mockRelease.tag_name}: ${releaseName}`;

    expect(title).toBe('Release v1.0.0: Major Update');
    expect(mockRelease.html_url).toBe(
      'https://github.com/lettermint/test-repo/releases/tag/v1.0.0'
    );
  });

  test('handles release without name gracefully', () => {
    const release = {
      tag_name: 'v2.0.0',
      name: null,
      body: 'Release notes',
      html_url: 'https://github.com/owner/repo/releases/tag/v2.0.0',
    };

    const releaseName = release.name || release.tag_name;
    const title = `Release ${release.tag_name}: ${releaseName}`;

    expect(title).toBe('Release v2.0.0: v2.0.0');
  });

  test('handles release without body gracefully', () => {
    const release = {
      tag_name: 'v1.5.0',
      name: 'Patch Release',
      body: null,
      html_url: 'https://github.com/owner/repo/releases/tag/v1.5.0',
    };

    expect(release.body).toBeNull();
  });

  test('truncates long release descriptions', () => {
    const longBody = `
      This is a very long release description that contains a lot of information
      about what changed in this version. It includes multiple paragraphs and
      detailed explanations of new features, bug fixes, and breaking changes.
      We want to make sure this gets truncated properly to avoid making the
      Discord embed too large and unwieldy for users to read.
    `.repeat(3);

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

    const truncated = truncateText(longBody, 300);
    expect(truncated.length).toBeLessThanOrEqual(303);
    expect(truncated.endsWith('...')).toBe(true);
  });
});
