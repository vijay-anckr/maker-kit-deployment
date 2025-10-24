import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { z } from 'zod';

// Custom phase for organizing user stories
interface CustomPhase {
  id: string;
  name: string;
  description: string;
  color: string; // Tailwind color class
  order: number;
  userStoryIds: string[];
}

// Business-focused user story following ChatPRD best practices
interface UserStory {
  id: string;
  title: string;
  userStory: string;
  businessValue: string;
  acceptanceCriteria: string[];
  status:
    | 'not_started'
    | 'research'
    | 'in_progress'
    | 'review'
    | 'completed'
    | 'blocked';
  priority: 'P0' | 'P1' | 'P2' | 'P3';
  estimatedComplexity: 'XS' | 'S' | 'M' | 'L' | 'XL';
  dependencies: string[];
  notes?: string;
  completedAt?: string;
}

// Structured PRD following ChatPRD format
interface StructuredPRD {
  introduction: {
    title: string;
    overview: string;
    lastUpdated: string;
  };

  problemStatement: {
    problem: string;
    marketOpportunity: string;
    targetUsers: string[];
  };

  solutionOverview: {
    description: string;
    keyFeatures: string[];
    successMetrics: string[];
  };

  userStories: UserStory[];
  customPhases?: CustomPhase[];

  technicalRequirements: {
    constraints: string[];
    integrationNeeds: string[];
    complianceRequirements: string[];
  };

  acceptanceCriteria: {
    global: string[];
    qualityStandards: string[];
  };

  constraints: {
    timeline: string;
    budget?: string;
    resources: string[];
    nonNegotiables: string[];
  };

  metadata: {
    version: string;
    created: string;
    lastUpdated: string;
    approver: string;
  };

  progress: {
    overall: number;
    completed: number;
    total: number;
    blocked: number;
  };
}

export class PRDManager {
  private static ROOT_PATH = process.cwd();

  private static get PRDS_DIR() {
    return join(this.ROOT_PATH, '.prds');
  }

  static setRootPath(path: string) {
    this.ROOT_PATH = path;
  }

  static async ensurePRDsDirectory(): Promise<void> {
    try {
      await mkdir(this.PRDS_DIR, { recursive: true });
    } catch {
      // Directory exists
    }
  }

  static async createStructuredPRD(
    title: string,
    overview: string,
    problemStatement: string,
    marketOpportunity: string,
    targetUsers: string[],
    solutionDescription: string,
    keyFeatures: string[],
    successMetrics: string[],
  ): Promise<string> {
    await this.ensurePRDsDirectory();

    const filename = `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.json`;
    const now = new Date().toISOString().split('T')[0];

    const prd: StructuredPRD = {
      introduction: {
        title,
        overview,
        lastUpdated: now,
      },
      problemStatement: {
        problem: problemStatement,
        marketOpportunity,
        targetUsers,
      },
      solutionOverview: {
        description: solutionDescription,
        keyFeatures,
        successMetrics,
      },
      userStories: [],
      technicalRequirements: {
        constraints: [],
        integrationNeeds: [],
        complianceRequirements: [],
      },
      acceptanceCriteria: {
        global: [],
        qualityStandards: [],
      },
      constraints: {
        timeline: '',
        resources: [],
        nonNegotiables: [],
      },
      metadata: {
        version: '1.0',
        created: now,
        lastUpdated: now,
        approver: '',
      },
      progress: {
        overall: 0,
        completed: 0,
        total: 0,
        blocked: 0,
      },
    };

    const filePath = join(this.PRDS_DIR, filename);
    await writeFile(filePath, JSON.stringify(prd, null, 2), 'utf8');

    return filename;
  }

  static async addUserStory(
    filename: string,
    userType: string,
    action: string,
    benefit: string,
    acceptanceCriteria: string[],
    priority: UserStory['priority'] = 'P2',
  ): Promise<string> {
    const prd = await this.loadPRD(filename);

    const userStory = `As a ${userType}, I want to ${action} so that ${benefit}`;
    const title = this.extractTitleFromAction(action);
    const complexity = this.assessComplexity(acceptanceCriteria);

    const storyNumber = prd.userStories.length + 1;
    const storyId = `US${storyNumber.toString().padStart(3, '0')}`;

    const newStory: UserStory = {
      id: storyId,
      title,
      userStory,
      businessValue: benefit,
      acceptanceCriteria,
      status: 'not_started',
      priority,
      estimatedComplexity: complexity,
      dependencies: [],
    };

    prd.userStories.push(newStory);
    this.updateProgress(prd);

    await this.savePRD(filename, prd);

    return `User story ${storyId} added: "${title}"`;
  }

  static async updateStoryStatus(
    filename: string,
    storyId: string,
    status: UserStory['status'],
    notes?: string,
  ): Promise<string> {
    const prd = await this.loadPRD(filename);
    const story = prd.userStories.find((s) => s.id === storyId);

    if (!story) {
      throw new Error(`Story ${storyId} not found`);
    }

    story.status = status;
    if (notes) {
      story.notes = notes;
    }
    if (status === 'completed') {
      story.completedAt = new Date().toISOString().split('T')[0];
    }

    this.updateProgress(prd);
    await this.savePRD(filename, prd);

    return `Story "${story.title}" updated to ${status}. Progress: ${prd.progress.overall}%`;
  }

  static async exportAsMarkdown(filename: string): Promise<string> {
    const prd = await this.loadPRD(filename);
    const content = this.formatPRDMarkdown(prd);

    const markdownFile = filename.replace('.json', '.md');
    const markdownPath = join(this.PRDS_DIR, markdownFile);
    await writeFile(markdownPath, content, 'utf8');

    return markdownFile;
  }

  static async generateImplementationPrompts(
    filename: string,
  ): Promise<string[]> {
    const prd = await this.loadPRD(filename);
    const prompts: string[] = [];

    prompts.push(
      `Implement "${prd.introduction.title}" based on the PRD. ` +
        `Goal: ${prd.solutionOverview.description}. ` +
        `Key features: ${prd.solutionOverview.keyFeatures.join(', ')}. ` +
        `You must research and decide all technical implementation details.`,
    );

    const readyStories = prd.userStories.filter(
      (s) => s.status === 'not_started',
    );
    readyStories.slice(0, 3).forEach((story) => {
      prompts.push(
        `Implement ${story.id}: "${story.userStory}". ` +
          `Business value: ${story.businessValue}. ` +
          `Acceptance criteria: ${story.acceptanceCriteria.join(' | ')}. ` +
          `Research technical approach and implement.`,
      );
    });

    return prompts;
  }

  static async getImprovementSuggestions(filename: string): Promise<string[]> {
    const prd = await this.loadPRD(filename);
    const suggestions: string[] = [];

    if (prd.userStories.length === 0) {
      suggestions.push('Add user stories to define specific functionality');
    }

    if (prd.solutionOverview.successMetrics.length === 0) {
      suggestions.push('Define success metrics to measure progress');
    }

    if (prd.acceptanceCriteria.global.length === 0) {
      suggestions.push('Add global acceptance criteria for quality standards');
    }

    const vagueStories = prd.userStories.filter(
      (s) => s.acceptanceCriteria.length < 2,
    );
    if (vagueStories.length > 0) {
      suggestions.push(
        `${vagueStories.length} stories need more detailed acceptance criteria`,
      );
    }

    const blockedStories = prd.userStories.filter(
      (s) => s.status === 'blocked',
    );
    if (blockedStories.length > 0) {
      suggestions.push(
        `${blockedStories.length} stories are blocked and need attention`,
      );
    }

    return suggestions;
  }

  static async listPRDs(): Promise<string[]> {
    await this.ensurePRDsDirectory();

    try {
      const files = await readdir(this.PRDS_DIR);

      return files.filter((file) => file.endsWith('.json'));
    } catch {
      return [];
    }
  }

  static async getPRDContent(filename: string): Promise<string> {
    const filePath = join(this.PRDS_DIR, filename);
    try {
      return await readFile(filePath, 'utf8');
    } catch {
      throw new Error(`PRD file "${filename}" not found`);
    }
  }

  static async getProjectStatus(filename: string): Promise<{
    progress: number;
    summary: string;
    nextSteps: string[];
    blockers: UserStory[];
  }> {
    const prd = await this.loadPRD(filename);

    const blockers = prd.userStories.filter((s) => s.status === 'blocked');
    const inProgress = prd.userStories.filter(
      (s) => s.status === 'in_progress',
    );
    const nextPending = prd.userStories
      .filter((s) => s.status === 'not_started')
      .slice(0, 3);

    const nextSteps = [
      ...inProgress.map((s) => `Continue: ${s.title}`),
      ...nextPending.map((s) => `Start: ${s.title}`),
    ];

    const summary = `${prd.progress.completed}/${prd.progress.total} stories completed (${prd.progress.overall}%). Total stories: ${prd.userStories.length}`;

    return {
      progress: prd.progress.overall,
      summary,
      nextSteps,
      blockers,
    };
  }

  // Custom Phase Management
  static async createCustomPhase(
    filename: string,
    name: string,
    description: string,
    color: string,
  ): Promise<string> {
    const prd = await this.loadPRD(filename);

    // Initialize customPhases if it doesn't exist
    if (!prd.customPhases) {
      prd.customPhases = [];
    }

    // Check for unique name
    if (prd.customPhases.some((p) => p.name === name)) {
      throw new Error(`Phase with name "${name}" already exists`);
    }

    const phaseId = `PHASE${(prd.customPhases.length + 1).toString().padStart(3, '0')}`;
    const order = prd.customPhases.length;

    const newPhase: CustomPhase = {
      id: phaseId,
      name,
      description,
      color,
      order,
      userStoryIds: [],
    };

    prd.customPhases.push(newPhase);
    await this.savePRD(filename, prd);

    return `Custom phase "${name}" created with ID ${phaseId}`;
  }

  static async updateCustomPhase(
    filename: string,
    phaseId: string,
    updates: Partial<Pick<CustomPhase, 'name' | 'description' | 'color'>>,
  ): Promise<string> {
    const prd = await this.loadPRD(filename);

    if (!prd.customPhases) {
      throw new Error('No custom phases found in this PRD');
    }

    const phase = prd.customPhases.find((p) => p.id === phaseId);
    if (!phase) {
      throw new Error(`Phase ${phaseId} not found`);
    }

    // Check for unique name if updating name
    if (updates.name && updates.name !== phase.name) {
      if (
        prd.customPhases.some(
          (p) => p.name === updates.name && p.id !== phaseId,
        )
      ) {
        throw new Error(`Phase with name "${updates.name}" already exists`);
      }
    }

    Object.assign(phase, updates);
    await this.savePRD(filename, prd);

    return `Phase "${phase.name}" updated successfully`;
  }

  static async deleteCustomPhase(
    filename: string,
    phaseId: string,
    reassignToPhaseId?: string,
  ): Promise<string> {
    const prd = await this.loadPRD(filename);

    if (!prd.customPhases) {
      throw new Error('No custom phases found in this PRD');
    }

    const phaseIndex = prd.customPhases.findIndex((p) => p.id === phaseId);
    if (phaseIndex === -1) {
      throw new Error(`Phase ${phaseId} not found`);
    }

    const phase = prd.customPhases[phaseIndex];

    // Handle story reassignment
    if (phase.userStoryIds.length > 0) {
      if (reassignToPhaseId) {
        const targetPhase = prd.customPhases.find(
          (p) => p.id === reassignToPhaseId,
        );
        if (!targetPhase) {
          throw new Error(
            `Target phase ${reassignToPhaseId} not found for reassignment`,
          );
        }
        targetPhase.userStoryIds.push(...phase.userStoryIds);
      } else {
        throw new Error(
          `Phase "${phase.name}" contains ${phase.userStoryIds.length} user stories. Provide reassignToPhaseId or move stories first.`,
        );
      }
    }

    prd.customPhases.splice(phaseIndex, 1);
    await this.savePRD(filename, prd);

    return `Phase "${phase.name}" deleted successfully`;
  }

  static async assignStoryToPhase(
    filename: string,
    storyId: string,
    phaseId: string,
  ): Promise<string> {
    const prd = await this.loadPRD(filename);

    if (!prd.customPhases) {
      throw new Error('No custom phases found in this PRD');
    }

    const story = prd.userStories.find((s) => s.id === storyId);
    if (!story) {
      throw new Error(`Story ${storyId} not found`);
    }

    const targetPhase = prd.customPhases.find((p) => p.id === phaseId);
    if (!targetPhase) {
      throw new Error(`Phase ${phaseId} not found`);
    }

    // Remove story from all phases first
    prd.customPhases.forEach((phase) => {
      phase.userStoryIds = phase.userStoryIds.filter((id) => id !== storyId);
    });

    // Add to target phase
    if (!targetPhase.userStoryIds.includes(storyId)) {
      targetPhase.userStoryIds.push(storyId);
    }

    await this.savePRD(filename, prd);

    return `Story "${story.title}" assigned to phase "${targetPhase.name}"`;
  }

  static async getCustomPhases(filename: string): Promise<CustomPhase[]> {
    const prd = await this.loadPRD(filename);
    return prd.customPhases || [];
  }

  // Private methods
  private static async loadPRD(filename: string): Promise<StructuredPRD> {
    const filePath = join(this.PRDS_DIR, filename);
    try {
      const content = await readFile(filePath, 'utf8');
      return JSON.parse(content);
    } catch {
      throw new Error(`PRD file "${filename}" not found`);
    }
  }

  private static async savePRD(
    filename: string,
    prd: StructuredPRD,
  ): Promise<void> {
    prd.metadata.lastUpdated = new Date().toISOString().split('T')[0];
    const filePath = join(this.PRDS_DIR, filename);
    await writeFile(filePath, JSON.stringify(prd, null, 2), 'utf8');
  }

  private static extractTitleFromAction(action: string): string {
    const cleaned = action.trim().toLowerCase();
    const words = cleaned.split(' ').slice(0, 4);
    return words
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  private static assessComplexity(
    criteria: string[],
  ): UserStory['estimatedComplexity'] {
    const count = criteria.length;
    if (count <= 2) return 'XS';
    if (count <= 3) return 'S';
    if (count <= 5) return 'M';
    if (count <= 8) return 'L';
    return 'XL';
  }

  private static updateProgress(prd: StructuredPRD): void {
    const completed = prd.userStories.filter(
      (s) => s.status === 'completed',
    ).length;
    const blocked = prd.userStories.filter(
      (s) => s.status === 'blocked',
    ).length;

    prd.progress.completed = completed;
    prd.progress.total = prd.userStories.length;
    prd.progress.blocked = blocked;
    prd.progress.overall =
      prd.userStories.length > 0
        ? Math.round((completed / prd.userStories.length) * 100)
        : 0;
  }

  private static formatPRDMarkdown(prd: StructuredPRD): string {
    let content = `# ${prd.introduction.title}\n\n`;

    content += `## Introduction\n\n`;
    content += `${prd.introduction.overview}\n\n`;
    content += `**Last Updated:** ${prd.introduction.lastUpdated}\n`;
    content += `**Version:** ${prd.metadata.version}\n\n`;

    content += `## Problem Statement\n\n`;
    content += `${prd.problemStatement.problem}\n\n`;
    content += `### Market Opportunity\n${prd.problemStatement.marketOpportunity}\n\n`;
    content += `### Target Users\n`;
    prd.problemStatement.targetUsers.forEach((user) => {
      content += `- ${user}\n`;
    });

    content += `\n## Solution Overview\n\n`;
    content += `${prd.solutionOverview.description}\n\n`;
    content += `### Key Features\n`;
    prd.solutionOverview.keyFeatures.forEach((feature) => {
      content += `- ${feature}\n`;
    });
    content += `\n### Success Metrics\n`;
    prd.solutionOverview.successMetrics.forEach((metric) => {
      content += `- ${metric}\n`;
    });

    content += `\n## User Stories\n\n`;

    const priorities: UserStory['priority'][] = ['P0', 'P1', 'P2', 'P3'];
    priorities.forEach((priority) => {
      const stories = prd.userStories.filter((s) => s.priority === priority);
      if (stories.length > 0) {
        content += `### Priority ${priority}\n\n`;

        stories.forEach((story) => {
          const statusIcon = this.getStatusIcon(story.status);
          content += `#### ${story.id}: ${story.title} ${statusIcon} [${story.estimatedComplexity}]\n\n`;
          content += `**User Story:** ${story.userStory}\n\n`;
          content += `**Business Value:** ${story.businessValue}\n\n`;
          content += `**Acceptance Criteria:**\n`;
          story.acceptanceCriteria.forEach((criterion) => {
            content += `- ${criterion}\n`;
          });

          if (story.dependencies.length > 0) {
            content += `\n**Dependencies:** ${story.dependencies.join(', ')}\n`;
          }

          content += '\n';
        });
      }
    });

    content += `\n## Progress\n\n`;
    content += `**Overall:** ${prd.progress.overall}% (${prd.progress.completed}/${prd.progress.total} stories)\n`;
    if (prd.progress.blocked > 0) {
      content += `**Blocked:** ${prd.progress.blocked} stories need attention\n`;
    }

    content += `\n---\n\n`;
    content += `*Approver: ${prd.metadata.approver || 'TBD'}*\n`;

    return content;
  }

  private static getStatusIcon(status: UserStory['status']): string {
    const icons = {
      not_started: '⏳',
      research: '🔍',
      in_progress: '🚧',
      review: '👀',
      completed: '✅',
      blocked: '🚫',
    };
    return icons[status];
  }
}

// MCP Server Tool Registration
export function registerPRDTools(server: McpServer) {
  createListPRDsTool(server);
  createGetPRDTool(server);
  createCreatePRDTool(server);
  createAddUserStoryTool(server);
  createUpdateStoryStatusTool(server);
  createExportMarkdownTool(server);
  createGetImplementationPromptsTool(server);
  createGetImprovementSuggestionsTool(server);
  createGetProjectStatusTool(server);
}

function createListPRDsTool(server: McpServer) {
  return server.tool(
    'list_prds',
    'List all Product Requirements Documents',
    async () => {
      const prds = await PRDManager.listPRDs();

      if (prds.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No PRD files found in .prds folder',
            },
          ],
        };
      }

      const prdList = prds.map((prd) => `- ${prd}`).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Found ${prds.length} PRD files:\n\n${prdList}`,
          },
        ],
      };
    },
  );
}

function createGetPRDTool(server: McpServer) {
  return server.tool(
    'get_prd',
    'Get the contents of a specific PRD file',
    {
      state: z.object({
        filename: z.string(),
      }),
    },
    async ({ state }) => {
      const content = await PRDManager.getPRDContent(state.filename);

      return {
        content: [
          {
            type: 'text',
            text: content,
          },
        ],
      };
    },
  );
}

function createCreatePRDTool(server: McpServer) {
  return server.tool(
    'create_prd',
    'Create a new structured PRD following ChatPRD best practices',
    {
      state: z.object({
        title: z.string(),
        overview: z.string(),
        problemStatement: z.string(),
        marketOpportunity: z.string(),
        targetUsers: z.array(z.string()),
        solutionDescription: z.string(),
        keyFeatures: z.array(z.string()),
        successMetrics: z.array(z.string()),
      }),
    },
    async ({ state }) => {
      const filename = await PRDManager.createStructuredPRD(
        state.title,
        state.overview,
        state.problemStatement,
        state.marketOpportunity,
        state.targetUsers,
        state.solutionDescription,
        state.keyFeatures,
        state.successMetrics,
      );

      return {
        content: [
          {
            type: 'text',
            text: `PRD created successfully: ${filename}`,
          },
        ],
      };
    },
  );
}

function createAddUserStoryTool(server: McpServer) {
  return server.tool(
    'add_user_story',
    'Add a new user story to an existing PRD',
    {
      state: z.object({
        filename: z.string(),
        userType: z.string(),
        action: z.string(),
        benefit: z.string(),
        acceptanceCriteria: z.array(z.string()),
        priority: z.enum(['P0', 'P1', 'P2', 'P3']).default('P2'),
      }),
    },
    async ({ state }) => {
      const result = await PRDManager.addUserStory(
        state.filename,
        state.userType,
        state.action,
        state.benefit,
        state.acceptanceCriteria,
        state.priority,
      );

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    },
  );
}

function createUpdateStoryStatusTool(server: McpServer) {
  return server.tool(
    'update_story_status',
    'Update the status of a specific user story',
    {
      state: z.object({
        filename: z.string(),
        storyId: z.string(),
        status: z.enum([
          'not_started',
          'research',
          'in_progress',
          'review',
          'completed',
          'blocked',
        ]),
        notes: z.string().optional(),
      }),
    },
    async ({ state }) => {
      const result = await PRDManager.updateStoryStatus(
        state.filename,
        state.storyId,
        state.status,
        state.notes,
      );

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    },
  );
}

function createExportMarkdownTool(server: McpServer) {
  return server.tool(
    'export_prd_markdown',
    'Export PRD as markdown for visualization and sharing',
    {
      state: z.object({
        filename: z.string(),
      }),
    },
    async ({ state }) => {
      const markdownFile = await PRDManager.exportAsMarkdown(state.filename);

      return {
        content: [
          {
            type: 'text',
            text: `PRD exported as markdown: ${markdownFile}`,
          },
        ],
      };
    },
  );
}

function createGetImplementationPromptsTool(server: McpServer) {
  return server.tool(
    'get_implementation_prompts',
    'Generate Claude Code implementation prompts from PRD',
    {
      state: z.object({
        filename: z.string(),
      }),
    },
    async ({ state }) => {
      const prompts = await PRDManager.generateImplementationPrompts(
        state.filename,
      );

      if (prompts.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'No implementation prompts available. Add user stories first.',
            },
          ],
        };
      }

      const promptsList = prompts.map((p, i) => `${i + 1}. ${p}`).join('\n\n');

      return {
        content: [
          {
            type: 'text',
            text: `Implementation prompts:\n\n${promptsList}`,
          },
        ],
      };
    },
  );
}

function createGetImprovementSuggestionsTool(server: McpServer) {
  return server.tool(
    'get_improvement_suggestions',
    'Get AI-powered suggestions to improve the PRD',
    {
      state: z.object({
        filename: z.string(),
      }),
    },
    async ({ state }) => {
      const suggestions = await PRDManager.getImprovementSuggestions(
        state.filename,
      );

      if (suggestions.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'PRD looks good! No specific improvements suggested at this time.',
            },
          ],
        };
      }

      const suggestionsList = suggestions.map((s) => `- ${s}`).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `Improvement suggestions:\n\n${suggestionsList}`,
          },
        ],
      };
    },
  );
}

function createGetProjectStatusTool(server: McpServer) {
  return server.tool(
    'get_project_status',
    'Get comprehensive status overview of the PRD project',
    {
      state: z.object({
        filename: z.string(),
      }),
    },
    async ({ state }) => {
      const status = await PRDManager.getProjectStatus(state.filename);

      let result = `**Project Status**\n\n`;
      result += `${status.summary}\n\n`;

      if (status.nextSteps.length > 0) {
        result += `**Next Steps:**\n`;
        status.nextSteps.forEach((step) => {
          result += `- ${step}\n`;
        });
        result += '\n';
      }

      if (status.blockers.length > 0) {
        result += `**Blockers:**\n`;
        status.blockers.forEach((blocker) => {
          result += `- ${blocker.title}: ${blocker.notes || 'No details provided'}\n`;
        });
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    },
  );
}
