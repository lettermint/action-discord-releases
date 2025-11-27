# Discord Release Webhook

A GitHub Action to post beautiful release announcements to Discord via webhooks.

[![Test Action](https://github.com/lettermint/action-discord-releases/actions/workflows/test.yml/badge.svg)](https://github.com/lettermint/action-discord-releases/actions/workflows/test.yml)
[![Check dist/](https://github.com/lettermint/action-discord-releases/actions/workflows/check-dist.yml/badge.svg)](https://github.com/lettermint/action-discord-releases/actions/workflows/check-dist.yml)

## Features

- **Rich Discord Embeds**: Automatically includes repository info, branch, and commit details
- **Fully Customizable**: Configure colors, messages, username, and avatar
- **Easy to Use**: Simple YAML configuration with sensible defaults
- **Type-Safe**: Built with TypeScript for reliability
- **Well Tested**: Comprehensive test coverage

## Quick Start

```yaml
name: Discord Release Notification
on:
  release:
    types: [published]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: lettermint/action-discord-releases@v1
        with:
          webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `webhook_url` | Discord webhook URL (use secrets!) | **Yes** | - |
| `color` | Embed color in hex (without #) | No | `8892be` |
| `username` | Webhook username override | No | `GitHub Release` |
| `avatar_url` | Webhook avatar URL | No | Package emoji 📦 |
| `content` | Message content (appears above embed) | No | `A new release is now available!` |
| `footer` | Footer text | No | `Powered by Lettermint · lettermint.co` |

## Usage Examples

### Basic Usage (Release Trigger)

```yaml
name: Discord Release Notification
on:
  release:
    types: [published]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: lettermint/action-discord-releases@v1
        with:
          webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
```

### Custom Colors and Messages

```yaml
- uses: lettermint/action-discord-releases@v1
  with:
    webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
    color: '00ff00'  # Green
    content: '🎉 New release v${{ github.ref_name }} is live!'
    footer: 'Released by ${{ github.actor }}'
```

### Push to Main Branch

```yaml
name: Discord Push Notification
on:
  push:
    branches:
      - main

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - uses: lettermint/action-discord-releases@v1
        with:
          webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
          content: 'New commit pushed to main!'
          color: '5865F2'
```

### Custom Branding

```yaml
- uses: lettermint/action-discord-releases@v1
  with:
    webhook_url: ${{ secrets.DISCORD_WEBHOOK_URL }}
    username: 'My Bot'
    avatar_url: 'https://example.com/my-avatar.png'
    content: 'Release announcement from My Company'
    footer: 'My Company © 2025'
```

## Discord Webhook Setup

1. Go to your Discord server settings
2. Navigate to **Integrations** → **Webhooks**
3. Click **New Webhook**
4. Configure the webhook name and channel
5. Click **Copy Webhook URL**
6. Add the URL to your GitHub repository secrets:
   - Go to your repo → **Settings** → **Secrets and variables** → **Actions**
   - Click **New repository secret**
   - Name: `DISCORD_WEBHOOK_URL`
   - Value: Paste your webhook URL

## Embed Structure

The Discord message includes:

- **Title**: Repository name (links to repository)
- **Color**: Customizable hex color
- **Timestamp**: Current time (ISO 8601)
- **Fields**:
  - 📦 **Repository**: Link to repository
  - 🌿 **Branch**: Current branch or tag
  - 🔗 **Commit**: Link to commit with short SHA
- **Footer**: Customizable footer text

## Color Reference

Colors are specified in hex format (without the `#` prefix):

| Color | Hex | Preview |
|-------|-----|---------|
| Discord Blurple | `5865F2` | 🟦 |
| Green | `57F287` | 🟩 |
| Yellow | `FEE75C` | 🟨 |
| Red | `ED4245` | 🟥 |
| White | `FFFFFF` | ⬜ |
| Black | `000000` | ⬛ |

**Tip**: Use a [color picker](https://www.google.com/search?q=color+picker) to find hex values.

## Development

### Prerequisites

- Node.js 20+
- npm 9+

### Local Setup

```bash
# Clone the repository
git clone https://github.com/lettermint/action-discord-releases.git
cd action-discord-releases

# Install dependencies
npm install

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Build and package
npm run all
```

### Build Process

1. **TypeScript Compilation**: `npm run build` compiles TypeScript to `lib/`
2. **Bundling**: `npm run package` uses `@vercel/ncc` to bundle everything into `dist/index.js`
3. **Commit**: The `dist/` directory must be committed (required by GitHub Actions)

### Testing

Run the test suite:

```bash
npm test
```

Tests include:
- Hex to decimal color conversion
- Branch name extraction
- Discord embed structure validation
- Webhook URL validation
- Error handling (400, 429 responses)

### Making Changes

1. Edit source code in `src/main.ts`
2. Update tests in `__tests__/main.test.ts`
3. Run `npm run all` to build, test, lint, and package
4. Commit both source and `dist/` changes

## Security

- **Never hardcode webhook URLs**: Always use GitHub Secrets
- **Webhook validation**: The action validates Discord webhook URLs
- **Error handling**: Sensitive data is not exposed in error messages
- **Dependencies**: Minimal dependencies, all from trusted sources (@actions/*)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm run all` to ensure everything passes
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details

## Support

- **Issues**: [GitHub Issues](https://github.com/lettermint/action-discord-releases/issues)

---

Made with ❤️ by Lettermint · lettermint.co
