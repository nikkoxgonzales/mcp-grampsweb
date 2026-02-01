/**
 * MCP Prompts for guiding LLM workflows with Gramps genealogy tools
 */

export interface PromptArgument {
  name: string;
  description: string;
  required?: boolean;
}

export interface GrampsPrompt {
  name: string;
  description: string;
  arguments?: PromptArgument[];
  getMessages: (args?: Record<string, string>) => Array<{ role: "user" | "assistant"; content: string }>;
}

/**
 * Research a person's lineage
 */
const researchPerson: GrampsPrompt = {
  name: "research-person",
  description: "Guide for finding and exploring a person's family lineage",
  arguments: [
    {
      name: "name",
      description: "Name of the person to research (e.g., 'John Smith')",
      required: false,
    },
  ],
  getMessages: (args) => {
    const nameClause = args?.name ? ` for "${args.name}"` : "";
    return [
      {
        role: "user",
        content: `Help me research a person's genealogy${nameClause}.`,
      },
      {
        role: "assistant",
        content: `I'll help you research${nameClause ? ` ${args?.name}'s` : " a person's"} genealogy. Here's the recommended workflow:

## Step 1: Find the Person
${args?.name ? `Search for "${args.name}" using:` : "First, search for the person:"}
- \`gramps_find\` - Full-text search if you only know the name
- \`gramps_search\` with entity_type="people" - For structured queries like \`surname=${args?.name?.split(" ").pop() || "Smith"}\`

## Step 2: Get Full Details
Once you have the person's handle from search results:
- \`gramps_get\` with entity_type="people" and the handle

## Step 3: Explore Lineage
With the person's handle:
- \`gramps_get_ancestors\` - View parents, grandparents (up to 10 generations)
- \`gramps_get_descendants\` - View children, grandchildren

## Step 4: Examine Related Records
Check linked entities:
- Events: Birth, death, marriage dates from event_ref_list
- Families: Spouse and children from family_list
- Sources: Documentation from citation_list

What would you like to do first?`,
      },
    ];
  },
};

/**
 * Add a new family member
 */
const addFamilyMember: GrampsPrompt = {
  name: "add-family-member",
  description: "Workflow for creating a person and linking them to an existing family",
  arguments: [
    {
      name: "relationship",
      description: "Relationship type: parent, child, or spouse",
      required: false,
    },
  ],
  getMessages: (args) => {
    const rel = args?.relationship?.toLowerCase() || "family member";
    return [
      {
        role: "user",
        content: `Help me add a new ${rel} to my family tree.`,
      },
      {
        role: "assistant",
        content: `I'll help you add a new ${rel}. Here's the workflow:

## Step 1: Create the Person
Use \`gramps_create_person\` with:
\`\`\`json
{
  "primary_name": {
    "first_name": "...",
    "surname": "..."
  },
  "gender": "male" | "female" | "unknown"
}
\`\`\`
Save the returned **handle** - you'll need it for family links.

## Step 2: Find or Create the Family
${rel === "child" ? `Find the parents' family using \`gramps_search\` with entity_type="families", or create one with \`gramps_create_family\`.` : ""}
${rel === "parent" ? `Find the child's parent family using their parent_family_list, or create a new family with \`gramps_create_family\`.` : ""}
${rel === "spouse" ? `Create a new family with \`gramps_create_family\` using both person handles.` : ""}
${!["child", "parent", "spouse"].includes(rel) ? `Use \`gramps_search\` to find existing families, or create one with \`gramps_create_family\`.` : ""}

## Step 3: Link to Family
Use \`gramps_create_family\` with appropriate handles:
- \`father_handle\`: Father's person handle
- \`mother_handle\`: Mother's person handle
- \`child_ref_list\`: Array of \`{ "ref": "child_handle" }\`

## Step 4: Add Life Events (Optional)
Create events with \`gramps_create_event\`:
- Birth: \`{ "type": "Birth", "date": { "dateval": [day, month, year] } }\`
- Death, Marriage, Baptism, etc.

Do you have the person's information ready?`,
      },
    ];
  },
};

/**
 * Get tree overview
 */
const treeOverview: GrampsPrompt = {
  name: "tree-overview",
  description: "Get database statistics and recent activity summary",
  getMessages: () => [
    {
      role: "user",
      content: "Give me an overview of my family tree database.",
    },
    {
      role: "assistant",
      content: `I'll get you a comprehensive overview of your family tree. Let me run these analyses:

## Getting Tree Statistics
I'll use \`gramps_tree_stats\` to get counts of:
- People, Families, Events
- Places, Sources, Citations
- Media, Notes, Repositories

## Checking Recent Activity
I'll use \`gramps_recent_changes\` to see what's been modified lately.

## Next Steps After Overview
Based on what we find:
- **If tree is empty**: We'll start adding people with \`gramps_create_person\`
- **If tree has data**: We can search with \`gramps_find\` or explore lineages

Let me fetch the statistics now.`,
    },
  ],
};

/**
 * GQL query syntax help
 */
const gqlQueryHelp: GrampsPrompt = {
  name: "gql-query-help",
  description: "Reference guide for Gramps Query Language (GQL) syntax",
  getMessages: () => [
    {
      role: "user",
      content: "How do I write GQL queries for Gramps search?",
    },
    {
      role: "assistant",
      content: `# Gramps Query Language (GQL) Reference

GQL is used with the \`gramps_search\` tool for structured queries.

## Basic Syntax
\`\`\`
field=value           # Exact match
field~value           # Contains (partial match)
field>value           # Greater than
field<value           # Less than
\`\`\`

## Logical Operators
\`\`\`
query1 AND query2     # Both conditions
query1 OR query2      # Either condition
NOT query             # Negation
\`\`\`

## Common Person Queries
\`\`\`
surname=Smith                      # Exact surname
surname~Sm                         # Surname contains "Sm"
gender=M                           # Males only (M/F/U)
birth.date.year>1900               # Born after 1900
death.date.year<1950               # Died before 1950
surname=Smith AND gender=F         # Female Smiths
\`\`\`

## Common Event Queries
\`\`\`
type=Birth                         # Birth events
type=Marriage                      # Marriage events
date.year=1920                     # Events in 1920
\`\`\`

## Common Place Queries
\`\`\`
name~London                        # Places containing "London"
place_type=City                    # Cities only
\`\`\`

## Example Usage
\`\`\`json
{
  "query": "surname=Smith AND birth.date.year>1850",
  "entity_type": "people",
  "pagesize": 20
}
\`\`\`

Would you like help constructing a specific query?`,
    },
  ],
};

/**
 * Link family relationships
 */
const linkFamily: GrampsPrompt = {
  name: "link-family",
  description: "Create family relationships between existing people",
  arguments: [
    {
      name: "relationship_type",
      description: "Type: marriage, parent-child, or siblings",
      required: false,
    },
  ],
  getMessages: (args) => {
    const relType = args?.relationship_type?.toLowerCase() || "family";
    return [
      {
        role: "user",
        content: `Help me link ${relType} relationships between people.`,
      },
      {
        role: "assistant",
        content: `I'll help you create ${relType} relationships.

## Prerequisites
You need the **handles** of the people you want to link. If you don't have them:
1. Use \`gramps_find\` to search by name
2. Note the handle from each search result

## Creating the Family Link

${relType === "marriage" || relType === "spouse" ? `### Marriage/Spouse Relationship
Use \`gramps_create_family\`:
\`\`\`json
{
  "father_handle": "husband_handle_here",
  "mother_handle": "wife_handle_here",
  "type": "Married"
}
\`\`\`
Then add a Marriage event with \`gramps_create_event\`.` : ""}

${relType === "parent-child" || relType === "child" ? `### Parent-Child Relationship
Use \`gramps_create_family\`:
\`\`\`json
{
  "father_handle": "father_handle_here",
  "mother_handle": "mother_handle_here",
  "child_ref_list": [
    { "ref": "child_handle_here" }
  ]
}
\`\`\`` : ""}

${relType === "siblings" ? `### Sibling Relationship
Siblings share the same parent family. Use \`gramps_create_family\`:
\`\`\`json
{
  "father_handle": "shared_father_handle",
  "mother_handle": "shared_mother_handle",
  "child_ref_list": [
    { "ref": "sibling1_handle" },
    { "ref": "sibling2_handle" }
  ]
}
\`\`\`` : ""}

${!["marriage", "spouse", "parent-child", "child", "siblings"].includes(relType) ? `### General Family Creation
Use \`gramps_create_family\` with appropriate handles:
- \`father_handle\`: Father's person handle
- \`mother_handle\`: Mother's person handle
- \`child_ref_list\`: Array of \`{ "ref": "child_handle" }\`
- \`type\`: Relationship type (Married, Unknown, etc.)` : ""}

## After Creating the Family
The family handle can be used to:
- Add more children later
- Attach marriage events
- Link to sources/citations

Do you have the person handles ready, or should we search for them first?`,
      },
    ];
  },
};

/**
 * Export all prompts
 */
export const grampsPrompts: Record<string, GrampsPrompt> = {
  "research-person": researchPerson,
  "add-family-member": addFamilyMember,
  "tree-overview": treeOverview,
  "gql-query-help": gqlQueryHelp,
  "link-family": linkFamily,
};

/**
 * Get prompt names for listing
 */
export const promptNames = Object.keys(grampsPrompts);
