export interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name?: string;
      email?: string;
      url?: string;
    };
    license?: {
      name: string;
      url?: string;
    };
  };
  servers: Array<{
    url: string;
    description?: string;
  }>;
  tags: Array<{
    name: string;
    description: string;
  }>;
  paths: Record<string, Record<string, unknown>>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
  };
}

export const openApiSpec: OpenAPISpec = {
  openapi: '3.0.3',
  info: {
    title: 'Examify API Documentation',
    version: '1.0.0',
    description: `
**Examify** is a production-grade, self-hosted AI Exam Generation Platform built on Next.js App Router, MariaDB (Prisma ORM), Redis, and multi-model AI adapters (OpenAI, Google Gemini, and Self-Hosted/vLLM/Ollama).

### Core Security Features:
- **Zero Cloudflare Dependencies**: Self-hosted Redis Sliding Window rate limiting and GeoIP resolution.
- **Strict Role-Based Access Control**: \`ADMIN\` and \`TEACHER\`.
- **Anti-Prompt Injection Guard**: Advanced sanitization and jailbreak defense for teacher custom instructions.
- **Permanent Initialization Lock**: One-time initial setup endpoint locked permanently once root admin is created.
    `,
    contact: {
      name: 'Examify Engineering Team',
      email: 'admin@examify.local',
    },
    license: {
      name: 'Proprietary',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Current API v1 Environment',
    },
  ],
  tags: [
    {
      name: 'Setup & System',
      description: 'Zero-day system initialization and permanent lock management',
    },
    {
      name: 'Authentication',
      description: 'JWT issuance, session validation, and revocation in Redis',
    },
    {
      name: 'Curriculum',
      description: 'Hierarchical taxonomy (Levels -> Grades -> Subjects -> Semesters -> Topics -> Lessons)',
    },
    {
      name: 'Exams',
      description: 'Multi-AI powered exam synthesis, prompt guard inspection, and file exports',
    },
    {
      name: 'Audit Logs',
      description: 'System-wide immutable security and audit logging (ADMIN only)',
    },
  ],
  components: {
    securitySchemes: {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Provide your JWT bearer token generated upon successful login or setup.',
      },
    },
    schemas: {
      StandardError: {
        type: 'object',
        required: ['success', 'message', 'code'],
        properties: {
          success: {
            type: 'boolean',
            example: false,
          },
          message: {
            type: 'string',
            example: 'Resource not found or validation failure.',
          },
          code: {
            type: 'string',
            example: 'VALIDATION_ERROR',
          },
        },
      },
      UserResponse: {
        type: 'object',
        properties: {
          id: { type: 'string', format: 'uuid', example: 'd3b07384-d113-460d-9b16-f288e2c4908a' },
          email: { type: 'string', format: 'email', example: 'teacher@examify.local' },
          fullName: { type: 'string', example: 'Prof. John Doe' },
          role: { type: 'string', enum: ['ADMIN', 'TEACHER'], example: 'TEACHER' },
          isActive: { type: 'boolean', example: true },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      CognitiveMatrix: {
        type: 'object',
        description: 'Percentage distribution for Bloom taxonomy / cognitive levels (must sum to 100%).',
        properties: {
          knowledge: { type: 'number', minimum: 0, maximum: 100, example: 40 },
          comprehension: { type: 'number', minimum: 0, maximum: 100, example: 30 },
          application: { type: 'number', minimum: 0, maximum: 100, example: 20 },
          highApplication: { type: 'number', minimum: 0, maximum: 100, example: 10 },
        },
      },
      Question: {
        type: 'object',
        properties: {
          questionNumber: { type: 'integer', example: 1 },
          type: {
            type: 'string',
            enum: ['MULTIPLE_CHOICE', 'TRUE_FALSE', 'SHORT_ANSWER', 'ESSAY'],
            example: 'MULTIPLE_CHOICE',
          },
          cognitiveLevel: {
            type: 'string',
            enum: ['KNOWLEDGE', 'COMPREHENSION', 'APPLICATION', 'HIGH_APPLICATION'],
            example: 'KNOWLEDGE',
          },
          content: {
            type: 'string',
            example: 'Solve for x: \\(2x^2 - 4x - 6 = 0\\)',
          },
          options: {
            type: 'array',
            items: { type: 'string' },
            example: ['A. x = 3 or x = -1', 'B. x = 2 or x = -3', 'C. x = -3 or x = 1', 'D. x = 1 or x = 4'],
          },
          correctAnswer: { type: 'string', example: 'A' },
          explanation: { type: 'string', example: 'Using the quadratic formula...' },
          points: { type: 'number', example: 0.5 },
        },
      },
      ExamStructure: {
        type: 'object',
        properties: {
          title: { type: 'string', example: '10th Grade Math Mid-Term Assessment' },
          curriculumSummary: { type: 'string', example: 'Upper Secondary / Grade 10 / Math / Semester 1' },
          examType: {
            type: 'string',
            enum: ['MIN_15', 'MID_TERM', 'FINAL_TERM', 'ENTRANCE'],
            example: 'MID_TERM',
          },
          durationMinutes: { type: 'integer', example: 45 },
          totalPoints: { type: 'number', example: 10.0 },
          totalQuestions: { type: 'integer', example: 20 },
          instructions: {
            type: 'array',
            items: { type: 'string' },
            example: ['Calculators are permitted', 'All questions are mandatory'],
          },
          questions: {
            type: 'array',
            items: { $ref: '#/components/schemas/Question' },
          },
        },
      },
    },
  },
  paths: {
    '/setup': {
      get: {
        tags: ['Setup & System'],
        summary: 'Check initialization status',
        description: 'Determines if the system requires first-time root administrator onboarding or is already locked.',
        responses: {
          '200': {
            description: 'System setup status retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        isInitialized: { type: 'boolean', example: false },
                        setupRequired: { type: 'boolean', example: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Setup & System'],
        summary: 'One-time setup for root ADMIN account',
        description: 'Creates the first ADMIN account, seeds base curriculum taxonomy, and permanently locks the setup endpoint. Any subsequent attempts return 403 Forbidden.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password', 'fullName', 'institutionName'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'master_admin@examify.local' },
                  password: { type: 'string', format: 'password', example: 'SecureAdminPassword123!' },
                  fullName: { type: 'string', example: 'Chief Academic Officer' },
                  institutionName: { type: 'string', example: 'National High School for the Gifted' },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Master administrator provisioned and system locked.',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'System initialized successfully.' },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        user: { $ref: '#/components/schemas/UserResponse' },
                        expiresAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '403': {
            description: 'System has already been initialized. Setup endpoint is permanently locked.',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' },
              },
            },
          },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Authenticate user & issue Redis session token',
        description: 'Validates email and password, creates an active session in Redis, and returns a signed JWT token.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['email', 'password'],
                properties: {
                  email: { type: 'string', format: 'email', example: 'teacher@examify.local' },
                  password: { type: 'string', format: 'password', example: 'TeacherSecret123!' },
                },
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Authentication successful',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1Ni...' },
                        user: { $ref: '#/components/schemas/UserResponse' },
                        expiresAt: { type: 'string', format: 'date-time' },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Invalid credentials or inactive user account',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' },
              },
            },
          },
        },
      },
    },
    '/curriculum/tree': {
      get: {
        tags: ['Curriculum'],
        summary: 'Retrieve hierarchical curriculum tree',
        description: 'Returns recursive tree: Levels -> Grades -> Subjects -> Semesters -> Topics -> Lessons.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'level',
            in: 'query',
            description: 'Optional filter by Level code (e.g. UPPER_SEC, LOWER_SEC, PRIMARY)',
            required: false,
            schema: { type: 'string' },
          },
          {
            name: 'grade',
            in: 'query',
            description: 'Optional filter by Grade code (e.g. G10, G11, G12)',
            required: false,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': {
            description: 'Curriculum tree retrieved successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        levels: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string' },
                              name: { type: 'string', example: 'Upper Secondary (THPT)' },
                              code: { type: 'string', example: 'UPPER_SEC' },
                              grades: { type: 'array', items: { type: 'object' } },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '401': {
            description: 'Authentication token missing or invalid',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' },
              },
            },
          },
        },
      },
    },
    '/exams': {
      get: {
        tags: ['Exams'],
        summary: 'List generated exams (Paginated)',
        description: 'Fetches paginated list of exams generated by or accessible to the authenticated user.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'page',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 1 },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 10 },
          },
          {
            name: 'status',
            in: 'query',
            required: false,
            schema: { type: 'string', enum: ['DRAFT', 'GENERATING', 'COMPLETED', 'FAILED'] },
          },
        ],
        responses: {
          '200': {
            description: 'List of exams',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        exams: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: {
                              id: { type: 'string', format: 'uuid' },
                              title: { type: 'string' },
                              examType: { type: 'string' },
                              status: { type: 'string' },
                              durationMinutes: { type: 'integer' },
                              totalQuestions: { type: 'integer' },
                              filePath: { type: 'string' },
                              createdAt: { type: 'string', format: 'date-time' },
                            },
                          },
                        },
                        pagination: {
                          type: 'object',
                          properties: {
                            page: { type: 'integer', example: 1 },
                            limit: { type: 'integer', example: 10 },
                            total: { type: 'integer', example: 42 },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      post: {
        tags: ['Exams'],
        summary: 'AI Exam Generation',
        description: 'Orchestrates PromptGuard safety verification, curriculum prompt building, strategy AI provider generation (OpenAI, Gemini, Self-Hosted/vLLM), atomic storage write, and async email dispatch.',
        security: [{ BearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'curriculum', 'examType', 'durationMinutes', 'totalQuestions'],
                properties: {
                  title: { type: 'string', example: 'Grade 10 Mathematics Mid-Term Exam' },
                  curriculum: {
                    type: 'object',
                    required: ['level', 'grade', 'subject', 'semester'],
                    properties: {
                      level: { type: 'string', example: 'Upper Secondary' },
                      grade: { type: 'string', example: 'Grade 10' },
                      subject: { type: 'string', example: 'Mathematics' },
                      semester: { type: 'string', example: 'Semester 1' },
                      topic: { type: 'string', example: 'Quadratic Functions & Equations' },
                      lesson: { type: 'string', example: 'Graphing Parabolas and Finding Vertices' },
                    },
                  },
                  examType: {
                    type: 'string',
                    enum: ['MIN_15', 'MID_TERM', 'FINAL_TERM', 'ENTRANCE'],
                    example: 'MID_TERM',
                  },
                  durationMinutes: { type: 'integer', minimum: 5, maximum: 180, example: 45 },
                  totalPoints: { type: 'number', minimum: 1, maximum: 100, example: 10.0 },
                  totalQuestions: { type: 'integer', minimum: 1, maximum: 50, example: 20 },
                  cognitiveMatrix: { $ref: '#/components/schemas/CognitiveMatrix' },
                  customPrompt: {
                    type: 'string',
                    maxLength: 1500,
                    description: 'Custom teacher directives. Analyzed for prompt injection / jailbreak attempts by PromptGuard.',
                    example: 'Please include 3 application problems related to parabolic bridge architecture.',
                  },
                  aiProvider: {
                    type: 'string',
                    enum: ['openai', 'gemini', 'self-hosted'],
                    example: 'gemini',
                    description: 'AI model adapter. Defaults to server system configuration.',
                  },
                  language: {
                    type: 'string',
                    default: 'Vietnamese',
                    example: 'Vietnamese',
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': {
            description: 'Exam generated successfully and persisted to /storage/exams',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    message: { type: 'string', example: 'Exam generated successfully' },
                    data: {
                      type: 'object',
                      properties: {
                        examId: { type: 'string', format: 'uuid' },
                        title: { type: 'string' },
                        status: { type: 'string', example: 'COMPLETED' },
                        filePath: { type: 'string', example: 'storage/exams/2026/09/exam_123.json' },
                        examData: { $ref: '#/components/schemas/ExamStructure' },
                        usage: {
                          type: 'object',
                          properties: {
                            promptTokens: { type: 'integer' },
                            completionTokens: { type: 'integer' },
                            totalTokens: { type: 'integer' },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '400': {
            description: 'PromptGuard blocked prompt injection attempt or invalid payload',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' },
              },
            },
          },
          '429': {
            description: 'Concurrent generation limit reached or rate limit exceeded',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' },
              },
            },
          },
          '502': {
            description: 'AI Provider downstream generation error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' },
              },
            },
          },
        },
      },
    },
    '/exams/{id}/download': {
      get: {
        tags: ['Exams'],
        summary: 'Download generated exam artifact',
        description: 'Reads the structured exam JSON or export artifact directly from local server storage (`/storage/exams/{year}/{month}/{id}.json`).',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            description: 'Exam unique UUID identifier',
            schema: { type: 'string', format: 'uuid' },
          },
          {
            name: 'format',
            in: 'query',
            required: false,
            description: 'Export format: json or markdown',
            schema: { type: 'string', enum: ['json', 'markdown'], default: 'json' },
          },
        ],
        responses: {
          '200': {
            description: 'Exam file artifact downloaded successfully',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ExamStructure' },
              },
              'text/markdown': {
                schema: { type: 'string' },
              },
            },
          },
          '404': {
            description: 'Exam artifact not found on local storage',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' },
              },
            },
          },
        },
      },
    },
    '/logs/activity': {
      get: {
        tags: ['Audit Logs'],
        summary: 'Retrieve structured audit activity logs (ADMIN Only)',
        description: 'Returns security and operational audit logs from MariaDB AuditLog table with IP, GeoIP country resolution, user actions, and raw event payloads.',
        security: [{ BearerAuth: [] }],
        parameters: [
          {
            name: 'action',
            in: 'query',
            required: false,
            description: 'Filter by action (e.g. SYSTEM_INITIALIZED, LOGIN_SUCCESS, PROMPT_INJECTION_BLOCKED, EXAM_GENERATED)',
            schema: { type: 'string' },
          },
          {
            name: 'limit',
            in: 'query',
            required: false,
            schema: { type: 'integer', default: 50 },
          },
        ],
        responses: {
          '200': {
            description: 'Audit logs retrieved',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string' },
                          action: { type: 'string' },
                          entity: { type: 'string' },
                          entityId: { type: 'string' },
                          userId: { type: 'string' },
                          clientIp: { type: 'string' },
                          country: { type: 'string', example: 'VN' },
                          createdAt: { type: 'string', format: 'date-time' },
                          details: { type: 'object' },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          '403': {
            description: 'Access denied: Requires ADMIN role',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StandardError' },
              },
            },
          },
        },
      },
    },
  },
};
