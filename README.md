# mcp-grampsweb

An MCP (Model Context Protocol) server for interacting with [Gramps Web](https://www.grampsweb.org/) genealogy API. This allows AI assistants like Claude to search, retrieve, and create genealogical records in your Gramps Web instance.

## Installation

```bash
npx mcp-grampsweb
```

Or install globally:

```bash
npm install -g mcp-grampsweb
```

## Configuration

The server requires the following environment variables:

| Variable | Description | Required |
|----------|-------------|----------|
| `GRAMPS_API_URL` | Base URL of your Gramps Web instance (e.g., `https://gramps.example.com`) | Yes |
| `GRAMPS_USERNAME` | Your Gramps Web username | Yes |
| `GRAMPS_PASSWORD` | Your Gramps Web password | Yes |

## Usage with Claude Desktop

Add the following to your Claude Desktop configuration file:

**macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "grampsweb": {
      "command": "npx",
      "args": ["mcp-grampsweb"],
      "env": {
        "GRAMPS_API_URL": "https://your-gramps-web.com",
        "GRAMPS_USERNAME": "your-username",
        "GRAMPS_PASSWORD": "your-password"
      }
    }
  }
}
```

## Available Tools

### Search & Retrieval

| Tool | Description |
|------|-------------|
| `gramps_search` | GQL-based search for any entity type (people, families, events, places, etc.) |
| `gramps_find` | Full-text search across all records |
| `gramps_get` | Get full entity details by handle or Gramps ID |

### Data Management

| Tool | Description |
|------|-------------|
| `gramps_create_person` | Create a new person record |
| `gramps_create_family` | Create a new family unit |
| `gramps_create_event` | Create a new life event (birth, death, marriage, etc.) |
| `gramps_create_place` | Create a new geographic location |
| `gramps_create_source` | Create a new source document |
| `gramps_create_citation` | Create a new citation |
| `gramps_create_note` | Create a new textual note |
| `gramps_create_media` | Create a new media object |
| `gramps_create_repository` | Create a new repository |

### Analysis

| Tool | Description |
|------|-------------|
| `gramps_tree_stats` | Get tree statistics (counts of all entity types) |
| `gramps_get_ancestors` | Find ancestors of a person (up to 10 generations) |
| `gramps_get_descendants` | Find descendants of a person (up to 10 generations) |
| `gramps_recent_changes` | Get recently modified records |

## Examples

### Search for people with a specific surname

```
Use gramps_search to find people with surname "Smith"
```

### Get ancestors of a person

```
Find the ancestors of person with handle "abc123" going back 4 generations
```

### Create a new person

```
Create a person named John Smith, male gender
```

## Development

```bash
# Clone the repository
git clone https://github.com/username/mcp-grampsweb.git
cd mcp-grampsweb

# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Run in development mode
npm run dev
```

### Testing with MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

## License

MIT
