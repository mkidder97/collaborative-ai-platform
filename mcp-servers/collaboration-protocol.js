#!/usr/bin/env node

/**
 * Collaboration Protocol MCP Server
 * Manages agent-to-agent communication and workflow coordination
 * Integrated with existing Collaborative AI Platform agents
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import crypto from 'crypto';

class CollaborationProtocolMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'collaboration-protocol',
        version: '1.0.0',
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupResourceHandlers();
    
    // Agent registry with existing platform agents
    this.agentRegistry = new Map([
      ['document-processor', {
        id: 'document-processor',
        name: 'Document Processor',
        capabilities: ['pdf_extraction', 'data_parsing', 'address_identification'],
        status: 'active',
        collaboration_preferences: { preferred_role: 'data_provider' }
      }],
      ['construction-specialist', {
        id: 'construction-specialist',
        name: 'Construction Specialist',
        capabilities: ['wind_calculations', 'sow_generation', 'compliance_checking'],
        status: 'active',
        collaboration_preferences: { preferred_role: 'analyst' }
      }],
      ['quality-reviewer', {
        id: 'quality-reviewer',
        name: 'Quality Reviewer',
        capabilities: ['peer_validation', 'accuracy_assessment', 'recommendation_generation'],
        status: 'active',
        collaboration_preferences: { preferred_role: 'validator' }
      }],
      ['aerial-cad', {
        id: 'aerial-cad',
        name: 'Aerial CAD Intelligence',
        capabilities: ['satellite_analysis', 'building_measurement', 'cad_generation'],
        status: 'active',
        collaboration_preferences: { preferred_role: 'data_enhancer' }
      }]
    ]);
    
    this.activeCollaborations = new Map();
    this.collaborationHistory = [];
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'initiate_collaboration',
          description: 'Start a collaborative workflow between agents',
          inputSchema: {
            type: 'object',
            properties: {
              collaboration_type: {
                type: 'string',
                enum: ['peer_review', 'enhancement', 'validation', 'delegation'],
                description: 'Type of collaboration'
              },
              requesting_agent: {
                type: 'string',
                description: 'Agent requesting collaboration'
              },
              target_agents: {
                type: 'array',
                items: { type: 'string' },
                description: 'Agents to collaborate with'
              },
              task_data: {
                type: 'object',
                description: 'Data for the collaborative task'
              }
            },
            required: ['collaboration_type', 'requesting_agent', 'target_agents', 'task_data']
          }
        },
        {
          name: 'send_agent_message',
          description: 'Send a message between agents in collaboration',
          inputSchema: {
            type: 'object',
            properties: {
              from_agent: {
                type: 'string',
                description: 'Sending agent'
              },
              to_agent: {
                type: 'string',
                description: 'Receiving agent'
              },
              message_type: {
                type: 'string',
                enum: ['request', 'response', 'enhancement', 'validation'],
                description: 'Type of message'
              },
              content: {
                type: 'object',
                description: 'Message content'
              }
            },
            required: ['from_agent', 'to_agent', 'message_type', 'content']
          }
        }
      ]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'initiate_collaboration':
            return await this.initiateCollaboration(args);
          
          case 'send_agent_message':
            return await this.sendAgentMessage(args);
          
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error executing ${name}: ${error.message}`
            }
          ],
          isError: true
        };
      }
    });
  }

  setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => ({
      resources: [
        {
          uri: 'protocol://agents/registry',
          name: 'Agent Registry',
          description: 'Registry of all collaborative agents and their capabilities',
          mimeType: 'application/json'
        },
        {
          uri: 'protocol://collaborations/active',
          name: 'Active Collaborations',
          description: 'Currently active collaborative workflows',
          mimeType: 'application/json'
        }
      ]
    }));

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      
      switch (uri) {
        case 'protocol://agents/registry':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(Object.fromEntries(this.agentRegistry), null, 2)
              }
            ]
          };
        
        case 'protocol://collaborations/active':
          return {
            contents: [
              {
                uri,
                mimeType: 'application/json',
                text: JSON.stringify(Object.fromEntries(this.activeCollaborations), null, 2)
              }
            ]
          };
        
        default:
          throw new Error(`Resource not found: ${uri}`);
      }
    });
  }

  async initiateCollaboration(args) {
    const { collaboration_type, requesting_agent, target_agents, task_data } = args;
    
    try {
      const collaborationId = crypto.randomUUID();
      
      const collaboration = {
        id: collaborationId,
        type: collaboration_type,
        requesting_agent: requesting_agent,
        target_agents: target_agents,
        task_data: task_data,
        status: 'initiated',
        created_date: new Date().toISOString(),
        messages: []
      };

      this.activeCollaborations.set(collaborationId, collaboration);

      return {
        content: [
          {
            type: 'text',
            text: `Collaboration initiated: ${collaboration_type} between ${requesting_agent} and ${target_agents.join(', ')}`
          },
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              collaboration_id: collaborationId,
              collaboration_type: collaboration_type,
              participants: [requesting_agent, ...target_agents],
              status: 'initiated'
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      throw new Error(`Collaboration initiation failed: ${error.message}`);
    }
  }

  async sendAgentMessage(args) {
    const { from_agent, to_agent, message_type, content } = args;
    
    try {
      const messageId = crypto.randomUUID();
      const message = {
        id: messageId,
        from_agent: from_agent,
        to_agent: to_agent,
        message_type: message_type,
        content: content,
        timestamp: new Date().toISOString()
      };

      return {
        content: [
          {
            type: 'text',
            text: `Message sent: ${from_agent} → ${to_agent} (${message_type})`
          },
          {
            type: 'text',
            text: JSON.stringify({
              success: true,
              message_id: messageId,
              from_agent: from_agent,
              to_agent: to_agent,
              message_type: message_type,
              timestamp: message.timestamp
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      throw new Error(`Sending message failed: ${error.message}`);
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Collaboration Protocol MCP Server running on stdio');
  }
}

// Run the server
const server = new CollaborationProtocolMCPServer();
server.run().catch(console.error);
