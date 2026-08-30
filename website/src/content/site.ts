export type Locale = 'zh' | 'en';

export type Feature = {
  title: string;
  description: string;
  proof: string;
};

export type WorkflowStep = {
  title: string;
  description: string;
};

export type ContentRow = {
  title: string;
  description: string;
};

export type SiteCopy = {
  localeLabel: string;
  languageLabel: string;
  brandDescriptor: string;
  nav: {
    features: string;
    workflow: string;
    safety: string;
    install: string;
    source: string;
  };
  hero: {
    eyebrow: string;
    title: string;
    titleAccent: string;
    description: string;
    primaryCta: string;
    secondaryCta: string;
    context: string;
    imageAlt: string;
    imageCaption: string;
  };
  problem: {
    eyebrow: string;
    title: string;
    lead: string;
    questions: string[];
    answer: string;
  };
  features: {
    eyebrow: string;
    title: string;
    intro: string;
    items: Feature[];
  };
  workflow: {
    eyebrow: string;
    title: string;
    intro: string;
    steps: WorkflowStep[];
  };
  evidence: {
    eyebrow: string;
    title: string;
    description: string;
    imageAlt: string;
    caption: string;
    notes: ContentRow[];
    contextImageAlt: string;
    contextCaption: string;
  };
  safety: {
    eyebrow: string;
    title: string;
    intro: string;
    rows: ContentRow[];
    note: string;
  };
  support: {
    eyebrow: string;
    title: string;
    intro: string;
    items: ContentRow[];
  };
  install: {
    eyebrow: string;
    title: string;
    description: string;
    commandLabel: string;
    command: string;
    copyLabel: string;
    copiedLabel: string;
    copyFailedLabel: string;
    requirementsLabel: string;
    requirements: string;
    sourceCta: string;
    releaseCta: string;
    restartNote: string;
  };
  faq: {
    eyebrow: string;
    title: string;
    items: ContentRow[];
  };
  footer: {
    tagline: string;
    openSource: string;
    license: string;
    issues: string;
    docs: string;
    copyright: string;
  };
};

export const locales: Locale[] = ['zh', 'en'];

export const siteCopy: Record<Locale, SiteCopy> = {
  zh: {
    localeLabel: '中文',
    languageLabel: '切换语言',
    brandDescriptor: 'DSH 运行时检查器',
    nav: {
      features: '核心能力',
      workflow: '工作方式',
      safety: '安全边界',
      install: '安装',
      source: '查看源码',
    },
    hero: {
      eyebrow: '给本地开发服务一个可核对的来源',
      title: '每一个开发端口，',
      titleAccent: '都能找到来源。',
      description: '在 DSH Web 中看见谁正在监听、哪个 Session 启动了它，以及处理后端口是否真的释放。',
      primaryCta: '安装插件',
      secondaryCta: '查看源码',
      context: 'Windows / DSH Web / TCP listeners',
      imageAlt: 'Port Inspector 展示本地开发服务的端口、项目和来源信息',
      imageCaption: '真实 DSH Web 运行记录，端口、项目、启动方和处理方式分开表达。',
    },
    problem: {
      eyebrow: '为什么需要它',
      title: '端口冲突只是表象，真正难的是没有上下文。',
      lead: '任务管理器能告诉你 PID，DSH 能管理 Job 和 Terminal，但两者之间缺了一条能核对的链路。',
      questions: [
        '这个端口属于哪个项目？',
        '它是哪个 Session、哪次 Tool Call 启动的？',
        '停止之后，端口真的释放了吗？',
      ],
      answer: 'Port Inspector 把 Windows 的监听快照和 DSH 的启动证据放到同一个视图。',
    },
    features: {
      eyebrow: '核心能力',
      title: '从发现到收尾，证据始终在场。',
      intro: '它不是通用任务管理器，而是面向 Coding Agent 开发场景的运行时检查和来源追踪工具。',
      items: [
        {
          title: '看见监听',
          description: '按端口、应用、PID、项目和 Session 搜索 Windows TCP 监听。',
          proof: '端口 / PID / 应用 / 项目',
        },
        {
          title: '追踪来源',
          description: '沿 Windows 父进程链匹配 DSH 根进程，证据完整时才显示“由 DSH 启动”。',
          proof: 'Session / Turn / Tool Call',
        },
        {
          title: '安全处理',
          description: '受管 Job 和 Terminal 走 DSH 生命周期，外部进程只允许对身份复核通过的单个 PID 操作。',
          proof: 'Managed / External / Read-only',
        },
        {
          title: '确认释放',
          description: '每次处理后重新扫描，用 fresh scan 明确反馈目标端口是否真的释放。',
          proof: 'Fresh scan / portReleased',
        },
      ],
    },
    workflow: {
      eyebrow: '工作方式',
      title: '它把两个世界接起来。',
      intro: '从 Windows 监听到 DSH Tool Call，每一步都保留在用户能理解的证据链上。',
      steps: [
        {
          title: '监听快照',
          description: '读取当前 TCP listeners，记录地址、端口、PID、应用和创建时间。',
        },
        {
          title: '根进程身份',
          description: '观察 DSH 创建的根进程，并同时保留 PID 与创建时间，避免 PID 复用混淆。',
        },
        {
          title: '来源核对',
          description: '沿父进程链把监听进程连接回 DSH 的 Session、Turn、Step 和 Tool Call。',
        },
        {
          title: '人工确认',
          description: '用户先看清项目、来源和处理方式，再选择停止受管资源或结束单个外部进程。',
        },
        {
          title: '重新扫描',
          description: '处理完成后获取 fresh scan，确认目标端口释放，同时保留其他服务。',
        },
      ],
    },
    evidence: {
      eyebrow: '产品证据',
      title: '不是猜测，是一条能复核的链路。',
      description: '真实界面显示端口、项目、启动方和处理方式。状态彼此独立，不把“属于哪个项目”误写成“由谁启动”。',
      imageAlt: 'Port Inspector 展示 Vite、PostgreSQL、Redis 和 Go 服务的监听结果',
      caption: '一个全栈演示项目中的真实监听结果。Docker 服务可以属于当前项目，但启动方仍保持未确认。',
      notes: [
        {
          title: '来源与处理分开',
          description: '“由 DSH 启动”只描述来源证据，“可停止”描述当前可用的生命周期处理方式。',
        },
        {
          title: '当前项目优先',
          description: '界面默认优先展示当前项目和明确的开发工具链，其他监听仍可搜索和展开。',
        },
        {
          title: '信息不足时收敛',
          description: '无法读取完整来源或权限不足时，记录仍然可见，但能力保持只读。',
        },
      ],
      contextImageAlt: 'DeepSeek Harness 中的 runtime-story 工作区与 Port Inspector 入口',
      contextCaption: '从 DSH Web 侧边栏进入 Port Inspector，保持在原有 Session 工作上下文中。',
    },
    safety: {
      eyebrow: '安全边界',
      title: '允许做的事，和不应该自动做的事，清楚写出来。',
      intro: '安全处理不是一个隐藏的快捷键，而是由证据、权限和用户确认共同决定的边界。',
      rows: [
        {
          title: '只读默认',
          description: '端口列表只用于诊断。模型可以读取有界、脱敏的信息，不能通过 Tool 直接终止进程。',
        },
        {
          title: '身份复核',
          description: '终止前同时校验 PID、创建时间和可执行文件，目标变化时立即拒绝操作。',
        },
        {
          title: '局部影响',
          description: '一次只处理用户明确选中的单个目标，不结束外部进程树，也不自动提权。',
        },
        {
          title: '能力降级',
          description: '系统进程、其他用户进程、受保护进程或证据不足的目标保持仅可查看。',
        },
      ],
      note: '它不是通用任务管理器，也不会自动把仍可能有用的后台服务判定为泄漏。',
    },
    support: {
      eyebrow: '支持范围',
      title: '为 Windows 本地 Coding Agent 开发而做。',
      intro: '第一版聚焦一个真实而高频的场景：DSH Web 在 Windows 上运行多个本地开发服务。',
      items: [
        {
          title: 'Windows local',
          description: '首版支持 Windows 本地执行环境和 TCP listeners。',
        },
        {
          title: 'DSH Web',
          description: '通过标准 Bundle 安装，从 Web 侧边栏打开 Port Inspector。',
        },
        {
          title: '开发工具链',
          description: '适合 Vite、Node.js、Go、Python、Docker Compose 等本地服务场景。',
        },
      ],
    },
    install: {
      eyebrow: '立即开始',
      title: '把下一次端口冲突，变成一个可回答的问题。',
      description: '安装 Bundle，重启目标 DSH Web Profile，然后从侧边栏打开 Port Inspector。',
      commandLabel: '通过 npm 安装',
      command: 'dsh plugin --profile web add dsh-port-inspector@latest',
      copyLabel: '复制命令',
      copiedLabel: '命令已复制',
      copyFailedLabel: '复制失败，请手动选择命令',
      requirementsLabel: '前置条件',
      requirements: 'Windows / Node.js >= 22.19.0 / DSH Web Profile',
      sourceCta: '从源码构建',
      releaseCta: '查看最新 Release',
      restartNote: '安装或更新 Bundle 后需要重启目标 Profile；来源记录从新的 DSH 运行周期开始。',
    },
    faq: {
      eyebrow: '常见问题',
      title: '在安装之前，先把边界讲清楚。',
      items: [
        {
          title: '它会自动关闭所有后台服务吗？',
          description: '不会。Port Inspector 默认只读。只有用户明确选择目标并通过身份复核后，才会进入受管关闭或外部单 PID 处理。',
        },
        {
          title: '支持 macOS 或 Linux 吗？',
          description: 'Windows MVP 暂不支持 macOS、Linux、UDP、远程主机、跨重启历史、批量终止或自动治理。',
        },
        {
          title: '来源信息不完整会怎样？',
          description: '端口记录仍然可以显示。来源会收敛为启动方未确认，权限或身份不足时处理方式保持仅可查看。',
        },
        {
          title: '需要启动另一个本地服务器吗？',
          description: '不需要。它作为标准 DSH Bundle 的 Host 和 Browser 双半工作，不启动第二个伴随 Web 服务。',
        },
      ],
    },
    footer: {
      tagline: '让本地服务的生命周期更可见。',
      openSource: '开源项目',
      license: 'MIT License',
      issues: '反馈问题',
      docs: '阅读文档',
      copyright: 'DSH Port Inspector，面向 DSH Web 的 Windows 本地运行时工具。',
    },
  },
  en: {
    localeLabel: 'English',
    languageLabel: 'Switch language',
    brandDescriptor: 'Runtime visibility for DSH Web',
    nav: {
      features: 'Capabilities',
      workflow: 'How it works',
      safety: 'Safety boundary',
      install: 'Install',
      source: 'View source',
    },
    hero: {
      eyebrow: 'Give every local service a traceable origin',
      title: 'Every local port',
      titleAccent: 'has a story.',
      description: 'See who is listening, which DSH Session started it, and whether the port was actually released after handling.',
      primaryCta: 'Install the plugin',
      secondaryCta: 'View source',
      context: 'Windows / DSH Web / TCP listeners',
      imageAlt: 'Port Inspector showing local development ports, projects, and process origins',
      imageCaption: 'A real DSH Web record. Port, project, starter, and handling mode stay separate.',
    },
    problem: {
      eyebrow: 'Why it exists',
      title: 'A port conflict is only the symptom. The missing context is the real problem.',
      lead: 'Task Manager can show a PID. DSH can manage Jobs and Terminals. What is missing is a chain you can verify between the two.',
      questions: [
        'Which project owns this port?',
        'Which Session and Tool Call started it?',
        'Was the port really released after stopping it?',
      ],
      answer: 'Port Inspector brings the Windows listener snapshot and DSH launch evidence into one view.',
    },
    features: {
      eyebrow: 'Capabilities',
      title: 'From discovery to cleanup, the evidence stays in view.',
      intro: 'It is not a general task manager. It is a runtime inspection and origin-tracing tool for Coding Agent development workflows.',
      items: [
        {
          title: 'See listeners',
          description: 'Search Windows TCP listeners by port, application, PID, project, and Session.',
          proof: 'Port / PID / app / project',
        },
        {
          title: 'Trace origins',
          description: 'Match the Windows parent chain to a DSH root process. Only complete evidence earns “Started by DSH”.',
          proof: 'Session / Turn / Tool Call',
        },
        {
          title: 'Handle safely',
          description: 'Managed Jobs and Terminals use DSH lifecycle APIs. External handling is limited to one identity-verified PID.',
          proof: 'Managed / External / Read-only',
        },
        {
          title: 'Confirm release',
          description: 'Run a fresh scan after every action and report whether the target port was actually released.',
          proof: 'Fresh scan / portReleased',
        },
      ],
    },
    workflow: {
      eyebrow: 'How it works',
      title: 'It connects two worlds without hiding the evidence.',
      intro: 'From the Windows listener to the DSH Tool Call, each step remains understandable and reviewable.',
      steps: [
        {
          title: 'Listener snapshot',
          description: 'Read current TCP listeners and record the address, port, PID, application, and creation time.',
        },
        {
          title: 'Root identity',
          description: 'Observe the root process created by DSH and keep PID plus creation time to guard against PID reuse.',
        },
        {
          title: 'Origin check',
          description: 'Walk the parent chain and connect the listener back to its DSH Session, Turn, Step, and Tool Call.',
        },
        {
          title: 'Human confirmation',
          description: 'Review the project, origin, and handling mode before stopping a managed resource or ending one external PID.',
        },
        {
          title: 'Fresh scan',
          description: 'Scan again after handling to confirm the target port is released while other services remain intact.',
        },
      ],
    },
    evidence: {
      eyebrow: 'Product evidence',
      title: 'Not a guess. A chain you can review.',
      description: 'The real interface shows the port, project, starter, and handling mode. Each state answers a different question.',
      imageAlt: 'Port Inspector showing Vite, PostgreSQL, Redis, and Go listener results',
      caption: 'A real full-stack project snapshot. Docker services can belong to the project while their starter remains unconfirmed.',
      notes: [
        {
          title: 'Origin and handling are separate',
          description: '“Started by DSH” describes origin evidence. “Can stop” describes the available lifecycle handling path.',
        },
        {
          title: 'Current project first',
          description: 'The UI prioritizes the current project and identified development toolchains while keeping other listeners searchable.',
        },
        {
          title: 'Degrade locally',
          description: 'Incomplete origin evidence or permissions keep the record visible, but the handling capability stays read-only.',
        },
      ],
      contextImageAlt: 'The runtime-story workspace and Port Inspector entry in DeepSeek Harness',
      contextCaption: 'Open Port Inspector from the DSH Web sidebar and stay in the existing Session context.',
    },
    safety: {
      eyebrow: 'Safety boundary',
      title: 'The allowed path and the unsafe shortcut are both explicit.',
      intro: 'Safe handling is a boundary defined by evidence, permissions, and user confirmation, not a hidden shortcut.',
      rows: [
        {
          title: 'Read-only by default',
          description: 'The port list is for diagnosis. Models can read bounded, redacted information, but cannot terminate through the Tool.',
        },
        {
          title: 'Identity recheck',
          description: 'Before termination, verify PID, creation time, and executable. If the target changes, refuse the action.',
        },
        {
          title: 'Local impact',
          description: 'Handle one explicitly selected target at a time. Never kill an external process tree or elevate automatically.',
        },
        {
          title: 'Capability fallback',
          description: 'System, protected, other-user, or insufficiently identified targets remain view-only.',
        },
      ],
      note: 'It is not a general task manager, and it does not label every still-useful background service as a leak.',
    },
    support: {
      eyebrow: 'Support scope',
      title: 'Made for local Windows development with Coding Agents.',
      intro: 'The first release focuses on one frequent, real-world path: multiple local services running in DSH Web on Windows.',
      items: [
        {
          title: 'Windows local',
          description: 'The first release targets Windows local execution and TCP listeners.',
        },
        {
          title: 'DSH Web',
          description: 'Install as a standard Bundle and open Port Inspector from the Web sidebar.',
        },
        {
          title: 'Development toolchains',
          description: 'Useful for local Vite, Node.js, Go, Python, and Docker Compose services.',
        },
      ],
    },
    install: {
      eyebrow: 'Get started',
      title: 'Turn the next port conflict into a question you can answer.',
      description: 'Install the Bundle, restart the target DSH Web Profile, then open Port Inspector from the sidebar.',
      commandLabel: 'Install with npm',
      command: 'dsh plugin --profile web add dsh-port-inspector@latest',
      copyLabel: 'Copy command',
      copiedLabel: 'Command copied',
      copyFailedLabel: 'Copy failed. Select the command manually.',
      requirementsLabel: 'Requirements',
      requirements: 'Windows / Node.js >= 22.19.0 / DSH Web Profile',
      sourceCta: 'Build from source',
      releaseCta: 'View latest Release',
      restartNote: 'Restart the target Profile after installing or updating the Bundle. Origin records begin with the new DSH runtime cycle.',
    },
    faq: {
      eyebrow: 'FAQ',
      title: 'A clear boundary before you install.',
      items: [
        {
          title: 'Does it automatically close every background service?',
          description: 'No. Port Inspector is read-only by default. Handling starts only after an explicit selection and identity recheck.',
        },
        {
          title: 'Does it support macOS or Linux?',
          description: 'The Windows MVP does not target macOS, Linux, UDP, remote hosts, cross-restart history, bulk termination, or automatic governance.',
        },
        {
          title: 'What happens when origin evidence is incomplete?',
          description: 'The listener can still be shown. Its starter becomes unconfirmed, and insufficient permissions or identity keep handling view-only.',
        },
        {
          title: 'Does it start another local server?',
          description: 'No. It works as the Host and Browser halves of a standard DSH Bundle without starting a second companion Web service.',
        },
      ],
    },
    footer: {
      tagline: 'Make local service lifecycles easier to see.',
      openSource: 'Open source project',
      license: 'MIT License',
      issues: 'Report an issue',
      docs: 'Read the docs',
      copyright: 'DSH Port Inspector, a Windows local runtime tool for DSH Web.',
    },
  },
};
