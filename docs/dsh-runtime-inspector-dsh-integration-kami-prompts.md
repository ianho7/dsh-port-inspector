# DSH Runtime Inspector — Kami Spatial Class Diagram Prompts

本文档按 D:/Downloads/kami-spatial-class-diagram-prompt-template.md 更新，用于生成 dsh-runtime-inspector-dsh-integration.md 中 6 张配图：前 3 张为 classDiagram，后 3 张为 flowchart / sequenceDiagram / flowchart。

统一输出规格：

- 目的：技术文档 / Markdown 配图
- 画布：16:9
- 目标尺寸：2400×1350 px
- 最小展示宽度：约 960 px
- 视觉锚点：Kami 空间化技术插图，暖纸张背景、单一墨蓝强调色、克制的伪 3D 线框层次
- 空间约束：diagrammatic pseudo-3D only；editorial wireframe depth；minimal spatial suggestion, not realistic 3D
- 文本约束：保留源码中的重要类名、关系和关键概念；删减低价值方法细节，不缩小核心标签

---

## Prompt 1 — Bundle 与 Cordis 集成类图

You are an expert technical illustrator.

Generate a Kami-style technical illustration based on the provided classDiagram and project context.

## Context

Project:
DSH Runtime Inspector

Description:
A same-repository DeepSeek Harness (DSH) Bundle for Windows local development. It observes TCP listeners, correlates Windows process identity and ancestry with DSH Sessions and Tool Calls when the required capabilities are available, and exposes Host-owned inspection and safe handling in DSH Web. It does not replace DSH lifecycle management, replace subprocess providers, or act as a general task manager.

Purpose:
A standalone technical documentation illustration for the Bundle and Cordis integration architecture, suitable for a Markdown document and a GitHub-style project documentation page.

## Source Diagram

The following classDiagram defines the system structure:

~~~mermaid
classDiagram
    class PackageManifest {
        <<DSH metadata>>
        +main: lib/index.js
        +bundlePatch: cordis.patch.yml
        +clientExport: lib/client.js
        +clientPlatform: web
    }

    class CordisCompositionPatch {
        <<Cordis composition>>
        +insertBundle(id)
    }

    class RuntimeInspectorHostEntry {
        <<plugin entry>>
        +apply(ctx)
    }

    class CordisContext {
        <<DSH/Cordis contract>>
        +provide(name, value)
        +get(name)
        +on(event, listener)
        +effect(factory)
    }

    class RuntimeInspectorService {
        <<plugin service>>
        +health
        +host
        +origins
        +listeners()
        +shutdown()
        +terminateExternal()
    }

    class DshToolRegistry {
        <<DSH service>>
        +register(definition)
    }

    class DshWebServer {
        <<optional DSH service>>
        +register(route)
    }

    class DshApiProxyHost {
        <<optional DSH capability>>
        +openPath(rpcId, path)
    }

    PackageManifest --> CordisCompositionPatch : dsh.bundle.patch
    CordisCompositionPatch --> RuntimeInspectorHostEntry : inserts Bundle
    RuntimeInspectorHostEntry --> CordisContext : apply(ctx)
    RuntimeInspectorHostEntry --> RuntimeInspectorService : provide(runtimeInspector)
    RuntimeInspectorHostEntry ..> DshToolRegistry : get / late publication
    RuntimeInspectorHostEntry ..> DshWebServer : get / late publication
    RuntimeInspectorHostEntry ..> DshApiProxyHost : apiProxy.host
~~~

## Visualization Goal

Transform this classDiagram into a refined Kami-style spatial editorial technical illustration.

Do not simply draw a plain flat UML class diagram. Reinterpret the structure as a calm, publication-quality architecture figure with subtle spatial depth while preserving the original meaning. The reader should understand at a glance that package metadata and the Cordis composition patch lead to the plugin entry point, which provides the Runtime Inspector service and connects to optional DSH capabilities.

## Structure Requirements

- Preserve all 8 classes, their stereotypes, all 7 relationships, relationship directions, and relationship labels.
- Do not invent new core components, services, APIs, or runtime layers.
- Make RuntimeInspectorHostEntry the most visually dominant class.
- Treat RuntimeInspectorService as the secondary core module.
- Keep PackageManifest → CordisCompositionPatch → RuntimeInspectorHostEntry as the main installation path.
- Keep CordisContext and RuntimeInspectorService as the two primary results of applying the Host entry.
- Group DshToolRegistry, DshWebServer, and DshApiProxyHost as optional DSH capabilities in one subtle spatial region, without turning the region into a new class.
- Preserve the difference between direct solid relationships and dashed optional or late-publication relationships.
- Simplify low-value method details when needed; never remove a class, stereotype, relationship, or key relationship label.

## Layout Requirements

Use a clear left-to-right visual hierarchy:

- Left: PackageManifest as the package metadata source.
- Left-center: CordisCompositionPatch as the composition step.
- Center: a dominant layered module block for RuntimeInspectorHostEntry.
- Right-center: CordisContext and RuntimeInspectorService as the main Host outputs.
- Far right or lower-right: a quiet grouped region containing the three optional DSH capabilities.

Use thin directional lines with light arrowheads. Keep connectors orthogonal or gently angled, never tangled. Relationship labels should sit in clean open space and never overlap a class box. Use the spatial arrangement to make the main path obvious; do not add duplicate arrows or invented flows.

## Spatial Illustration Style

Do not present the result as a plain flat UML diagram.

Instead, reinterpret it as a refined spatial technical illustration:

- Use diagrammatic pseudo-3D only.
- Use wireframe volumetric containers or lightly offset structural planes behind the major modules.
- Use isometric-like or lightly oblique module blocks, but keep all class labels on readable front-facing editorial panels.
- Use layered grouping and floating structural units to distinguish package metadata, plugin integration, Host outputs, and optional DSH capabilities.
- Suggest depth through thin offset outlines, layered borders, and restrained perspective; never through photorealistic materials, gradients, highlights, or shadows.
- Keep the spatial treatment abstract, minimal, calm, and diagrammatic.
- Use no abstract technical object unless it clarifies the package-to-runtime composition path.

## Kami Visual Style

Follow the visual language of tw93/Kami:

- warm parchment paper background, #f5f4ed, never pure white
- ink blue, #1B365D, as the only accent color
- concentrate ink blue on RuntimeInspectorHostEntry; use a pale blue tint only for RuntimeInspectorService
- all other modules use warm ivory surfaces, warm gray borders, and a yellow-brown undertone
- thin geometric single-line strokes
- simple flat shapes with subtle dimensional layering
- elegant serif-led typography
- restrained mono lettering only for code-like tokens when essential
- generous whitespace
- scientific paper figure aesthetic
- calm, precise visual tone
- consistent line weight and spatial depth across all modules

## Legend and Explanatory Elements

Include a compact and elegant legend outside the main diagram area, ideally as a horizontal strip at the bottom.

The legend should explain only the visual grammar used in this figure:

- ink-blue focal module: plugin integration point
- warm ivory module: supporting class or DSH contract
- solid arrow: direct composition or service-provision relationship
- dashed arrow: optional capability, late publication, or non-owning runtime seam

Use minimal flat swatches or token-like line markers. Keep the legend quiet, aligned, and subordinate to the main composition. Do not add legend entries for components that do not exist in the source diagram.

## Text Rendering

Use only essential labels.

Prefer:

- exact class names
- exact stereotypes
- short relationship labels
- a few essential API hints

Render all class names exactly and case-sensitively:

- PackageManifest
- CordisCompositionPatch
- RuntimeInspectorHostEntry
- CordisContext
- RuntimeInspectorService
- DshToolRegistry
- DshWebServer
- DshApiProxyHost

Preserve key relationship labels such as dsh.bundle.patch, inserts Bundle, apply(ctx), provide(runtimeInspector), get / late publication, and apiProxy.host.

Avoid long code snippets, full method lists, verbose descriptions, and dense UML attribute details. If space is limited, remove secondary member text before reducing the size of class names or relationship labels. Do not display raw Mermaid syntax in the final illustration.

## Avoid

Do not use:

- photorealistic 3D rendering
- glossy 3D objects
- realistic photos
- colorful UI dashboard style
- gradients
- neon colors
- excessive decoration
- cyberpunk style
- cluttered infographic style
- game-like environment
- invented services or infrastructure
- a floating legend inside the main composition
- crossing lines or labels placed on top of connectors
- a plain unstructured UML screenshot

## Output

Create a standalone technical illustration suitable for:

Technical documentation, Markdown embedding, and a GitHub-style project architecture page.

Aspect ratio:
16:9

Quality:
High resolution, publication-quality figure. Target output 2400×1350 px, with all essential labels legible at approximately 960 px display width.

---

## Prompt 2 — Tool、Subprocess 与生命周期类图

You are an expert technical illustrator.

Generate a Kami-style technical illustration based on the provided classDiagram and project context.

## Context

Project:
DSH Runtime Inspector

Description:
A same-repository DeepSeek Harness (DSH) Bundle for Windows local development. It observes TCP listeners, correlates Windows process identity and ancestry with DSH Sessions and Tool Calls when the required capabilities are available, and exposes Host-owned inspection and safe handling in DSH Web. It does not replace DSH lifecycle management, replace subprocess providers, or act as a general task manager.

Purpose:
A standalone technical documentation illustration explaining DSH event observation, Tool attribution, subprocess origin tracking, lifecycle ownership, listener scanning, and the separation between managed DSH shutdown and external single-process handling.

## Source Diagram

The following classDiagram defines the system structure:

~~~mermaid
classDiagram
    class RuntimeInspectorHostEntry {
        <<plugin>>
        +apply(ctx)
    }

    class RuntimeAttribution {
        <<plugin>>
        +observeSessionEvent()
        +runToolExecution()
        +observeToolResult()
        +decorateSubprocessService()
        +patchSubprocessProvider()
    }

    class DshEventSeams {
        <<Cordis internal contract>>
        +sessionEvent
        +toolsExecute
        +toolsResult
        +internalGet
        +internalService
    }

    class DshToolExecution {
        <<DSH payload>>
        +agent
        +session
        +callId
        +rootCallId
        +turn
        +step
        +name
    }

    class DshSubprocessService {
        <<DSH service>>
        +spawn(spec)
        +spawnTerminal(spec)
    }

    class LocalSubprocessRuntime {
        <<DSH provider; gated fallback>>
        +spawn(spec)
        +spawnTerminal(spec)
    }

    class ProcessOriginRegistry {
        <<plugin>>
        +record(origin)
        +list()
        +update()
    }

    class LifecycleOwnerRegistry {
        <<plugin>>
        +beginExecution()
        +bindingFor(originId)
        +shutdown(originId)
    }

    class DshJobService {
        <<DSH service>>
        +list(owner)
        +onJobsChanged(listener)
        +kill(id, owner)
        +wait(id, timeout)
    }

    class DshTerminalService {
        <<DSH service>>
        +list(owner)
        +kill(owner, sessionId)
    }

    class WindowsListenerScanner {
        <<plugin>>
        +scanWithStatus(origins)
    }

    class ExternalProcessTerminator {
        <<plugin>>
        +terminate(target, request)
    }

    class RuntimeInspectorHost {
        <<plugin Host boundary>>
        +inventory()
        +performAction()
    }

    LocalSubprocessRuntime ..|> DshSubprocessService
    RuntimeInspectorHostEntry --> RuntimeAttribution : creates
    RuntimeInspectorHostEntry --> LifecycleOwnerRegistry : creates
    RuntimeInspectorHostEntry --> WindowsListenerScanner : creates
    RuntimeInspectorHostEntry --> ExternalProcessTerminator : creates
    RuntimeInspectorHostEntry --> RuntimeInspectorHost : wires callbacks

    RuntimeAttribution ..> DshEventSeams : registers observers
    DshEventSeams ..> DshToolExecution : execution payload
    RuntimeAttribution ..> DshSubprocessService : internal/get Proxy
    RuntimeAttribution ..> LocalSubprocessRuntime : reversible method patch
    RuntimeAttribution --> ProcessOriginRegistry : records verified roots
    RuntimeAttribution --> LifecycleOwnerRegistry : captures lifecycle

    RuntimeAttribution ..> DshJobService : reads from agent context
    RuntimeAttribution ..> DshTerminalService : reads from agent context
    LifecycleOwnerRegistry ..> DshJobService : kill + wait
    LifecycleOwnerRegistry ..> DshTerminalService : kill

    RuntimeInspectorHost ..> ProcessOriginRegistry : visible origins
    RuntimeInspectorHost ..> WindowsListenerScanner : scan
    RuntimeInspectorHost ..> LifecycleOwnerRegistry : managed callback
    RuntimeInspectorHost ..> ExternalProcessTerminator : external callback
    ExternalProcessTerminator --> WindowsListenerScanner : re-scan
~~~

## Visualization Goal

Transform this classDiagram into a refined Kami-style spatial editorial technical illustration.

Do not simply draw a plain flat UML class diagram. Reinterpret the structure as a spatial architecture figure that shows the runtime attribution path and the Host action boundary. The reader should understand how DSH event seams and Tool execution data reach RuntimeAttribution, how subprocess observation becomes process-origin and lifecycle-owner data, and how inspection branches into managed DSH lifecycle callbacks versus external process handling.

## Structure Requirements

- Preserve all 13 classes, their stereotypes, every relationship, relationship direction, relationship label, and the implementation relationship.
- Do not invent new core components, databases, queues, APIs, process managers, or security layers.
- Make RuntimeAttribution the primary focal module.
- Make RuntimeInspectorHost the secondary focal boundary.
- Keep RuntimeInspectorHostEntry as the plugin entry point that creates and wires the plugin-side components.
- Keep DshEventSeams, DshToolExecution, DshSubprocessService, and LocalSubprocessRuntime as distinct upstream or observation elements.
- Keep ProcessOriginRegistry and LifecycleOwnerRegistry as distinct registries.
- Keep DshJobService and DshTerminalService visibly separate; they are different DSH lifecycle services.
- Keep WindowsListenerScanner, ExternalProcessTerminator, and RuntimeInspectorHost visibly separate.
- Preserve LocalSubprocessRuntime ..|> DshSubprocessService as an implementation relationship.
- Visually mark LocalSubprocessRuntime as a gated fallback with a restrained neutral dashed spatial outline; do not imply that it replaces the DSH subprocess provider.
- Simplify low-value method details when needed; never remove a class, relationship, or key label.

## Layout Requirements

Use a wide, readable composition with two related spatial regions:

- Upper-left entry: RuntimeInspectorHostEntry.
- Central focal region: RuntimeAttribution.
- Upstream around the focal region: DshEventSeams, DshToolExecution, DshSubprocessService, and LocalSubprocessRuntime.
- Center-right: ProcessOriginRegistry and LifecycleOwnerRegistry.
- Right-side authority boundary: RuntimeInspectorHost.
- Lower-right action and verification region: WindowsListenerScanner, ExternalProcessTerminator, DshJobService, and DshTerminalService.

Use subtle region captions ATTRIBUTION / OWNERSHIP and INSPECTION / ACTION only as grouping labels, never as new components.

The main visual reading path should be:

DSH events and Tool execution → RuntimeAttribution → subprocess observation → verified origins and lifecycle ownership → Host inventory or action

Use the spatial arrangement to express this path without adding duplicate flow arrows. Keep relationship lines thin, directional, and separated from all text. Put relationship labels on small parchment-colored masks so no line bleeds through the label.

Use small branch captions Managed shutdown and External termination only as explanatory labels near the relevant action paths. They are concepts, not additional classes.

## Spatial Illustration Style

Do not present the result as a plain flat UML diagram.

Instead, reinterpret it as a refined spatial technical illustration:

- Use diagrammatic pseudo-3D only.
- Place RuntimeAttribution in a central layered wireframe volume or offset module stack to establish its importance.
- Arrange upstream DSH seams and payloads as lightly floating structural units feeding into the focal module.
- Arrange origin and lifecycle registries as connected but distinct spatial planes to show the two kinds of captured state.
- Build the right-side Host and action components as a restrained decision area, not a dashboard.
- Suggest depth through offset wireframe borders, layered planes, and slight oblique alignment; do not use realistic materials, gradients, highlights, or shadows.
- Use no decorative process icons, people, servers, or abstract machinery unless they carry necessary structural meaning.
- Keep the dense figure calm, sparse enough to scan, and legible at the intended display width.

## Kami Visual Style

Follow the visual language of tw93/Kami:

- warm parchment paper background, #f5f4ed, never pure white
- ink blue, #1B365D, as the only accent color
- concentrate ink blue on RuntimeAttribution and use a pale blue tint or restrained blue edge on RuntimeInspectorHost
- all other modules use warm ivory surfaces, warm gray borders, and a yellow-brown undertone
- thin geometric single-line strokes
- simple flat shapes with subtle dimensional layering
- elegant serif-led typography
- restrained mono lettering only for code-like tokens such as internal/get
- generous whitespace despite the high class count
- scientific paper figure aesthetic
- calm, precise visual tone
- consistent wireframe depth and line weight
- no decorative icon system

## Legend and Explanatory Elements

Include a compact horizontal legend outside the main diagram area, ideally at the bottom.

The legend should explain only the visual grammar used here:

- ink-blue focal module: RuntimeAttribution or Host decision boundary
- warm ivory module: plugin component or DSH contract
- solid relation: direct creation, recording, ownership, or implementation path
- dashed relation: observation, internal seam, callback, or non-owning dependency
- neutral dashed outline: gated fallback provider

Optionally include two small explanatory labels, Managed shutdown and External termination, as branch meanings. Keep the legend quiet, aligned, and subordinate. Do not introduce any component that is absent from the classDiagram.

## Text Rendering

Use only essential labels.

Prefer:

- exact class names
- exact stereotypes
- short relationship labels
- short branch captions
- a few essential API hints

Render all class names exactly and case-sensitively:

- RuntimeInspectorHostEntry
- RuntimeAttribution
- DshEventSeams
- DshToolExecution
- DshSubprocessService
- LocalSubprocessRuntime
- ProcessOriginRegistry
- LifecycleOwnerRegistry
- DshJobService
- DshTerminalService
- WindowsListenerScanner
- ExternalProcessTerminator
- RuntimeInspectorHost

Preserve key relationship labels including creates, wires callbacks, registers observers, execution payload, internal/get Proxy, reversible method patch, records verified roots, captures lifecycle, reads from agent context, kill + wait, visible origins, managed callback, external callback, and re-scan.

Do not render full method lists, long code snippets, or verbose prose. If the figure becomes crowded, remove secondary member details before shrinking class names or relationship labels. Do not display raw Mermaid syntax in the final illustration.

## Avoid

Do not use:

- photorealistic 3D rendering
- glossy 3D objects
- realistic photos
- colorful UI dashboard style
- gradients
- neon colors
- excessive decoration
- cyberpunk style
- cluttered infographic style
- game-like environment
- invented databases, queues, servers, or security layers
- duplicated flow arrows
- a legend that competes with the diagram
- a plain UML screenshot with no spatial hierarchy
- lines crossing class panels or explanatory text

## Output

Create a standalone technical illustration suitable for:

Technical documentation, Markdown embedding, and a GitHub-style architecture explanation.

Aspect ratio:
16:9

Quality:
High resolution, publication-quality figure. Target output 2400×1350 px, with all essential labels legible at approximately 960 px display width.

---

## Prompt 3 — DSH Browser Client 与 Host 桥接类图

You are an expert technical illustrator.

Generate a Kami-style technical illustration based on the provided classDiagram and project context.

## Context

Project:
DSH Runtime Inspector

Description:
A same-repository DeepSeek Harness (DSH) Bundle for Windows local development. It observes TCP listeners, correlates Windows process identity and ancestry with DSH Sessions and Tool Calls when the required capabilities are available, and exposes Host-owned inspection and safe handling in DSH Web. It does not replace DSH lifecycle management, replace subprocess providers, or act as a general task manager.

Purpose:
A standalone technical documentation illustration explaining the DSH Client integration, Browser-side RPC flow, same-origin Web route, serializable Host RPC, and the Host authority boundary.

## Source Diagram

The following classDiagram defines the system structure:

~~~mermaid
classDiagram
    class RuntimeInspectorClientEntry {
        <<plugin Client entry>>
        +inject: slots, sessions
        +apply(ctx)
    }

    class DshClientRuntime {
        <<@deepseek-ai/dsh-client-runtime>>
    }

    class DshSlotsService {
        <<DSH Client service>>
        +inject(slot, factory)
        +register(component)
    }

    class DshSessionsService {
        <<DSH Client service>>
        +list
        +binding(sessionId)
    }

    class SidebarFooterSlot {
        <<DSH slot>>
        +sidebar.footer.action
    }

    class ShellOverlaySlot {
        <<DSH slot>>
        +shell.overlay
    }

    class RuntimeInspectorBrowserRpc {
        <<plugin Browser>>
        +inventory()
        +copyDetails()
        +openProjectDirectory()
        +performAction()
    }

    class RuntimeInspectorWebRoute {
        <<plugin same-origin route>>
        +POST inventory
        +POST copy
        +POST open-project-directory
        +POST action
    }

    class RuntimeInspectorHostRpc {
        <<serializable Host RPC>>
        +inventory()
        +copyDetails()
        +openProjectDirectory()
        +performAction()
    }

    class RuntimeInspectorHost {
        <<plugin Host>>
        +inventory()
        +performAction()
    }

    RuntimeInspectorClientEntry ..> DshClientRuntime : injected by dsh.client
    DshClientRuntime --> DshSlotsService
    DshClientRuntime --> DshSessionsService

    RuntimeInspectorClientEntry --> RuntimeInspectorBrowserRpc : creates
    RuntimeInspectorClientEntry --> SidebarFooterSlot : injects
    RuntimeInspectorClientEntry --> ShellOverlaySlot : injects
    RuntimeInspectorClientEntry ..> DshSessionsService : presentation context

    RuntimeInspectorBrowserRpc --> RuntimeInspectorWebRoute : same-origin POST
    RuntimeInspectorWebRoute --> RuntimeInspectorHostRpc : dispatches serializable data
    RuntimeInspectorHostRpc --> RuntimeInspectorHost : invokes Host boundary
~~~

## Visualization Goal

Transform this classDiagram into a refined Kami-style spatial editorial technical illustration.

Do not simply draw a plain flat UML class diagram. Reinterpret the structure as a spatial bridge between the DSH Client runtime, the Browser-side integration, and the Host-side authority boundary. The reader should understand that the client runtime supplies slots and session presentation context, the Browser sends a same-origin serializable request, and the Host remains the only decision boundary for inventory and actions.

## Structure Requirements

- Preserve all 10 classes, their stereotypes, every relationship, relationship direction, relationship label, and boundary meaning.
- Do not invent Windows scanners, Koffi bindings, process handles, Job/Terminal APIs, termination primitives, databases, or permission systems.
- Keep RuntimeInspectorClientEntry as the client integration pivot.
- Keep DshClientRuntime, DshSlotsService, and DshSessionsService distinct in the DSH Client runtime region.
- Keep SidebarFooterSlot and ShellOverlaySlot distinct as the two injection targets.
- Keep RuntimeInspectorBrowserRpc and RuntimeInspectorWebRoute distinct in the Browser region.
- Keep RuntimeInspectorHostRpc and RuntimeInspectorHost distinct in the Host region.
- Make RuntimeInspectorHost the primary focal boundary.
- Make RuntimeInspectorHostRpc the secondary focal module.
- Preserve the distinction between presentation context and action authority.
- Simplify low-value method details when needed; never remove a class or relationship.

## Layout Requirements

Use three subtle spatial regions arranged from left to right:

1. DSH CLIENT RUNTIME
   - DshClientRuntime
   - DshSlotsService
   - DshSessionsService
   - RuntimeInspectorClientEntry
   - SidebarFooterSlot
   - ShellOverlaySlot

2. BROWSER / SAME-ORIGIN ROUTE
   - RuntimeInspectorBrowserRpc
   - RuntimeInspectorWebRoute

3. HOST AUTHORITY BOUNDARY
   - RuntimeInspectorHostRpc
   - RuntimeInspectorHost

The main visual reading path should be:

DSH Client runtime → Client entry and slots → Browser RPC → same-origin Web route → serializable Host RPC → Host boundary

Use a subtle vertical boundary between the Browser region and the Host region. Label it SERIALIZABLE HOST BOUNDARY or BROWSER / HOST BOUNDARY as a boundary annotation, never as a new class.

Use thin directional connectors and keep all relationship labels outside class text. The final RuntimeInspectorHostRpc → RuntimeInspectorHost relationship should be visually decisive without adding any extra arrow.

## Spatial Illustration Style

Do not present the result as a plain flat UML diagram.

Instead, reinterpret it as a refined spatial technical illustration:

- Use diagrammatic pseudo-3D only.
- Build the three regions as lightly layered wireframe planes or oblique editorial slabs.
- Use the DSH Client region as a calm source layer, the Browser region as a narrow bridge layer, and the Host region as the visually strongest authority layer.
- Use a thin spatial bridge between RuntimeInspectorWebRoute, RuntimeInspectorHostRpc, and RuntimeInspectorHost to clarify serialized request flow.
- Keep class names on flat, front-facing panels so the text remains legible.
- Suggest depth through offset outlines and layered borders, never through photorealistic materials, gradients, highlights, or shadows.
- Do not use browser window chrome, UI screenshots, or decorative network/cloud objects.
- Keep the overall composition abstract, minimal, balanced, and suitable for a research paper figure.

## Kami Visual Style

Follow the visual language of tw93/Kami:

- warm parchment paper background, #f5f4ed, never pure white
- ink blue, #1B365D, as the only accent color
- concentrate ink blue on RuntimeInspectorHost; use a pale blue tint on RuntimeInspectorHostRpc
- use warm ivory and warm gray for the DSH Client and Browser-side modules
- thin geometric single-line strokes
- simple flat shapes with subtle dimensional layering
- elegant serif-led typography
- restrained mono lettering only for code-like route tokens such as POST inventory
- generous whitespace
- scientific paper figure aesthetic
- calm, precise, trustworthy visual tone
- consistent wireframe depth and line weight
- keep the Browser region visually lighter than the Host authority boundary

## Legend and Explanatory Elements

Include a compact horizontal legend outside the main diagram area, ideally at the bottom.

The legend should explain only the visual grammar used here:

- ink-blue focal module: Host authority boundary
- pale blue module: serializable Host RPC
- warm ivory module: Client or Browser-side supporting class
- solid arrow: request, dispatch, or invocation path
- dashed arrow: injected runtime or presentation-context relationship

Keep the legend quiet, aligned, and low-profile. Do not add legend entries for Windows capabilities or actions that are not present in this classDiagram.

## Text Rendering

Use only essential labels.

Prefer:

- exact class names
- exact stereotypes
- short relationship labels
- short region captions
- a few essential API hints

Render all class names exactly and case-sensitively:

- RuntimeInspectorClientEntry
- DshClientRuntime
- DshSlotsService
- DshSessionsService
- SidebarFooterSlot
- ShellOverlaySlot
- RuntimeInspectorBrowserRpc
- RuntimeInspectorWebRoute
- RuntimeInspectorHostRpc
- RuntimeInspectorHost

Preserve key relationship labels including injected by dsh.client, creates, injects, presentation context, same-origin POST, dispatches serializable data, and invokes Host boundary.

Do not render full method lists, long code snippets, browser UI copy, or verbose descriptions. If space is limited, remove secondary member text before shrinking class names or relationship labels. Do not display raw Mermaid syntax in the final illustration.

## Avoid

Do not use:

- photorealistic 3D rendering
- glossy 3D objects
- realistic photos
- colorful UI dashboard style
- gradients
- neon colors
- excessive decoration
- cyberpunk style
- cluttered infographic style
- game-like environment
- browser window mockups
- UI screenshots
- invented Windows or security components
- merging Browser RPC with Host RPC
- a legend placed inside the main request path
- a plain UML screenshot with no spatial hierarchy
- lines crossing class panels or text

## Output

Create a standalone technical illustration suitable for:

Technical documentation, Markdown embedding, and a GitHub-style architecture explanation.

Aspect ratio:
16:9

Quality:
High resolution, publication-quality figure. Target output 2400×1350 px, with all essential labels legible at approximately 960 px display width.

---

## Prompt 4 — 运行时组件关系图

You are an expert technical illustrator.

Generate a Kami-style spatial technical illustration based on the provided diagram source and project context.

## Context

Project:
DSH Runtime Inspector

Description:
A same-repository DeepSeek Harness (DSH) Bundle for Windows local development. It observes TCP listeners, correlates Windows process identity and ancestry with DSH Sessions and Tool Calls when the required capabilities are available, and exposes Host-owned inspection and safe handling in DSH Web. It does not replace DSH lifecycle management, replace subprocess providers, or act as a general task manager.

Purpose:
A standalone technical documentation illustration for the runtime component relationship map, suitable for a Markdown document, architecture explanation, and GitHub-style project documentation.

## Source Diagram

The following flowchart defines the system structure:

~~~mermaid
flowchart LR
    subgraph DSH["DeepSeek Harness / Cordis"]
        Context["Cordis Context"]
        Events["Event seams<br/>session/event · tools/execute · tools/result"]
        Internal["Internal service seams<br/>internal/get · internal/service"]
        Tools["tools service"]
        Subprocess["subprocess service<br/>spawn / spawnTerminal"]
        Jobs["jobs service"]
        Terminals["terminals service"]
        WebServer["webServer<br/>(optional)"]
        ApiProxy["apiProxy.host.openPath<br/>(optional)"]
        ClientRuntime["@deepseek-ai/dsh-client-runtime"]
        Slots["slots"]
        Sessions["sessions"]
    end

    subgraph Host["Runtime Inspector Host 半"]
        Entry["src/index.ts<br/>apply(ctx)"]
        Gate["Capability gate<br/>compatibility.ts"]
        Attribution["RuntimeAttribution"]
        Origins["ProcessOriginRegistry"]
        Lifecycle["LifecycleOwnerRegistry"]
        Scanner["WindowsListenerScanner"]
        Terminator["ExternalProcessTerminator"]
        HostRpc["RuntimeInspectorHost<br/>Host RPC boundary"]
        PortList["port_list Tool"]
        Route["Same-origin Web Route"]
        Adapters["DSH Host adapters"]
    end

    subgraph Browser["Runtime Inspector Browser 半"]
        ClientEntry["src/client/index.ts"]
        BrowserRpc["RuntimeInspectorBrowserRpc"]
        Ui["Sidebar entry + shell overlay"]
    end

    Context --> Entry
    Entry --> Gate
    Entry --> Attribution
    Entry --> Origins
    Entry --> Lifecycle
    Entry --> Scanner
    Entry --> Terminator
    Entry --> HostRpc

    Events -. observe .-> Attribution
    Internal -. proxy / late publication .-> Attribution
    Subprocess -. spawn handles .-> Attribution
    Attribution --> Origins
    Attribution --> Lifecycle
    Jobs -. owner APIs .-> Lifecycle
    Terminals -. owner APIs .-> Lifecycle
    Tools -. register .-> PortList
    Origins --> Scanner
    Scanner --> HostRpc
    Lifecycle --> HostRpc
    Terminator --> HostRpc

    WebServer -. register route .-> Route
    Route --> HostRpc
    ApiProxy -. open directory .-> Adapters
    Adapters --> HostRpc

    ClientRuntime --> Slots
    ClientRuntime --> Sessions
    ClientEntry --> BrowserRpc
    ClientEntry --> Ui
    Slots --> Ui
    Sessions -. presentation context .-> ClientEntry
    BrowserRpc --> Route
~~~

## Visualization Goal

Transform this flowchart into a refined Kami-style spatial editorial technical illustration.

Do not simply draw a plain flat flowchart. Reinterpret the structure as a publication-quality spatial architecture map that shows the relationship between DeepSeek Harness / Cordis, the Runtime Inspector Host half, and the Runtime Inspector Browser half.

The reader should understand at a glance that DSH services and event seams feed the Host-side attribution and lifecycle components, the Host owns scanning and action boundaries, and the Browser reaches the Host through a same-origin route.

## Structure Requirements

- Preserve every named subgraph, node, node label, relationship, relationship direction, relationship label, and optional/dashed relationship from the source.
- Preserve the three major regions: DeepSeek Harness / Cordis, Runtime Inspector Host half, and Runtime Inspector Browser half.
- Do not invent new core components, services, databases, queues, process managers, or security layers.
- Make RuntimeAttribution the primary focal module.
- Make the Host RPC boundary represented by HostRpc / RuntimeInspectorHost the secondary focal module.
- Keep Gate / compatibility.ts distinct from Entry / src/index.ts.
- Keep Origins / ProcessOriginRegistry and Lifecycle / LifecycleOwnerRegistry distinct.
- Keep Scanner / WindowsListenerScanner, Terminator / ExternalProcessTerminator, PortList / port_list Tool, Route / Same-origin Web Route, and Adapters / DSH Host adapters distinct.
- Keep ClientRuntime, Slots, Sessions, ClientEntry, BrowserRpc, and Ui as distinct Browser-side or DSH Client components.
- Preserve the fact that Shell or PowerShell Tool is an upstream path observed through subprocess, not a direct plugin caller or an additional node.
- Simplify low-value implementation text only when needed; never remove a named node or relationship.

## Layout Requirements

Use a clear left-to-right and cross-boundary reading path:

- Left spatial plane: DeepSeek Harness / Cordis services and seams, including Context, Events, Internal, Tools, Subprocess, Jobs, Terminals, WebServer, ApiProxy, ClientRuntime, Slots, and Sessions.
- Center spatial plane: Runtime Inspector Host half, with Entry and Gate leading to RuntimeAttribution.
- Make RuntimeAttribution the visual center of gravity.
- Place Origins and Lifecycle downstream of attribution.
- Place Scanner, Terminator, PortList, Route, Adapters, and HostRpc around the Host decision boundary.
- Right or lower-right spatial plane: Runtime Inspector Browser half, with ClientEntry, BrowserRpc, and Ui.
- Show the Browser request path through BrowserRpc → Route → HostRpc.
- Show the DSH Client path through ClientRuntime → Slots / Sessions → ClientEntry → Ui.
- Use thin directional lines and preserve solid versus dashed relationships exactly.
- Do not duplicate source relationships with decorative arrows.

## Spatial Illustration Style

Do not present the result as a plain flat flowchart.

Instead, reinterpret it as a refined spatial technical illustration with subtle pseudo-3D structure:

- Use three lightly layered wireframe volumetric planes for DSH, Host, and Browser.
- Use isometric-like module blocks or lightly oblique structural slabs, while keeping all labels on readable front-facing panels.
- Use a larger layered wireframe volume for the Runtime Inspector Host region.
- Use thin offset outlines and restrained perspective to suggest depth.
- Use cross-plane connectors only where the source defines a relationship.
- Keep the spatial treatment diagrammatic, abstract, minimal, and calm.
- Depth must come from linework and layered borders, not gradients, highlights, shadows, or realistic materials.
- Do not turn the figure into a product UI, network dashboard, or cinematic scene.

## Kami Visual Style

Follow the visual language of tw93/Kami:

- warm parchment paper background, #f5f4ed, never pure white
- ink blue, #1B365D, as the only accent color
- concentrate ink blue on RuntimeAttribution and use a pale blue tint on the Host RPC boundary
- all other modules use warm ivory surfaces, warm gray borders, and a yellow-brown undertone
- thin geometric single-line strokes
- simple flat shapes with subtle dimensional layering
- elegant serif-led typography
- restrained mono lettering only for code-like tokens such as internal/get or port_list
- generous whitespace and clear region separation
- scientific paper figure aesthetic
- calm, precise visual tone
- consistent wireframe depth and line weight

## Legend and Explanatory Elements

Include a compact and elegant horizontal legend outside the main diagram area, ideally as a strip at the bottom.

The legend should explain only the visual grammar used in this figure:

- ink-blue focal module: attribution or Host RPC boundary
- warm ivory module: DSH service, plugin component, or Browser component
- solid arrow: direct data, creation, registration, or invocation path
- dashed arrow: observed, optional, proxy, late-publication, or presentation-context relationship as labeled in the source
- wireframe region: DSH, Host, or Browser subsystem boundary

Use minimal flat swatches or token-like line markers. Keep the legend quiet, aligned, and subordinate. Do not add legend entries for components that do not exist in the source.

## Text Rendering

Use only essential labels.

Prefer:

- exact visible node labels from the source
- exact subsystem names
- short relationship labels
- key protocol or route tokens

Preserve all source node labels, including:

- Cordis Context
- Event seams
- Internal service seams
- tools service
- subprocess service
- jobs service
- terminals service
- webServer
- apiProxy.host.openPath
- @deepseek-ai/dsh-client-runtime
- slots
- sessions
- src/index.ts
- Capability gate
- RuntimeAttribution
- ProcessOriginRegistry
- LifecycleOwnerRegistry
- WindowsListenerScanner
- ExternalProcessTerminator
- RuntimeInspectorHost
- port_list Tool
- Same-origin Web Route
- DSH Host adapters
- src/client/index.ts
- RuntimeInspectorBrowserRpc
- Sidebar entry + shell overlay

Preserve key relationship labels such as observe, proxy / late publication, spawn handles, owner APIs, register, visible origins, scan, open directory, presentation context, and the Browser-to-Host route.

Avoid long code snippets, verbose descriptions, and dense implementation details. Do not display raw Mermaid syntax. If space is limited, remove secondary line details before removing source node labels.

## Avoid

Do not use:

- photorealistic 3D rendering
- glossy 3D objects
- realistic photos
- colorful UI dashboard style
- gradients
- neon colors
- excessive decoration
- cyberpunk style
- cluttered infographic style
- game-like environment
- invented services, databases, queues, or security layers
- browser window mockups
- a plain unstructured flowchart screenshot
- duplicated arrows
- lines crossing module panels or text

## Output

Create a standalone technical illustration suitable for:

Technical documentation, Markdown embedding, and a GitHub-style runtime architecture explanation.

Aspect ratio:
16:9

Quality:
High resolution, publication-quality figure. Target output 2400×1350 px, with all essential labels legible at approximately 960 px display width.

---

## Prompt 5 — 端口来源归因时序图

You are an expert technical illustrator.

Generate a Kami-style spatial technical illustration based on the provided diagram source and project context.

## Context

Project:
DSH Runtime Inspector

Description:
A same-repository DeepSeek Harness (DSH) Bundle for Windows local development. It observes TCP listeners, correlates Windows process identity and ancestry with DSH Sessions and Tool Calls when the required capabilities are available, and exposes Host-owned inspection and safe handling in DSH Web. It does not replace DSH lifecycle management, replace subprocess providers, or act as a general task manager.

Purpose:
A standalone technical documentation illustration showing how one Tool Call becomes a verified Process origin that can later be matched to a listening port.

## Source Diagram

The following sequenceDiagram defines the system structure:

~~~mermaid
sequenceDiagram
    autonumber
    participant Session as DSH Session
    participant Events as Cordis event seams
    participant Attribution as RuntimeAttribution
    participant Dispatcher as DSH Tool dispatcher
    participant Tool as Tool body
    participant Provider as subprocess provider
    participant Jobs as DSH jobs
    participant Terminals as DSH terminals
    participant Lifecycle as LifecycleOwnerRegistry
    participant Origins as ProcessOriginRegistry
    participant Scanner as WindowsListenerScanner
    participant Host as RuntimeInspectorHost

    Session->>Events: publish session/event(tool/call)
    Events->>Attribution: observeSessionEvent(subject, event)
    Attribution->>Attribution: cache Session, Call ID, root Call ID, Turn, Step, Tool

    Dispatcher->>Events: tools/execute(execution, next)
    Events->>Attribution: runToolExecution(execution, next)
    Attribution->>Lifecycle: beginExecution(agent, callId)
    Lifecycle->>Jobs: snapshot list(owner)
    Lifecycle->>Terminals: snapshot list(owner)

    Tool->>Events: lookup subprocess service
    alt internal/get seam is observed
        Events->>Attribution: internal/get(subprocess, next)
        Attribution->>Events: call next() for original service
        Events-->>Attribution: original subprocess service
        Attribution-->>Tool: non-mutating decorated Proxy
    else provider read bypasses internal/get
        Attribution->>Provider: reversible spawn method wrapper already installed
        Provider-->>Tool: original provider behavior retained
    end

    Tool->>Provider: spawn(spec) or spawnTerminal(spec)
    Provider-->>Attribution: subprocess handle
    Attribution->>Attribution: read PID and Windows creation identity
    Attribution->>Origins: record verified Process origin

    opt background Job is published
        Jobs-->>Lifecycle: onJobsChanged()
        Lifecycle->>Origins: associate new jobId with captured origin
    end

    opt persistent Terminal is created
        Terminals-->>Lifecycle: terminal snapshot / session identity
        Lifecycle->>Origins: associate terminalSessionId
    end

    Tool-->>Dispatcher: Tool result
    Dispatcher->>Events: tools/result(execution, value)
    Events->>Attribution: observeToolResult()
    Attribution->>Lifecycle: finish(structured jobId cross-check)

    Host->>Scanner: scanWithStatus(origins)
    Scanner->>Origins: read retained origins
    Scanner->>Scanner: match PID ancestry and creation identity
    Scanner-->>Host: listener rows and attribution status
~~~

## Visualization Goal

Transform this sequenceDiagram into a refined Kami-style spatial editorial technical illustration.

Do not simply draw a plain flat sequence diagram. Reinterpret it as a calm research-figure timeline showing the complete attribution path from Session events, through Tool execution and subprocess observation, to retained process origins and Host-side listener scanning.

The reader should understand that internal/get observation and the LocalSubprocessRuntime fallback are alternative observation seams, not simultaneous provider replacement paths.

## Structure Requirements

- Preserve all 12 participants, their order, every message direction, message label, return message, alt/else branch, opt branch, and the autonumbered sequence order.
- Do not invent new participants, process managers, providers, databases, or lifecycle abstractions.
- Make RuntimeAttribution the primary focal lane.
- Make RuntimeInspectorHost the secondary Host-side boundary.
- Keep DSH Session, Cordis event seams, DSH Tool dispatcher, Tool body, subprocess provider, DSH jobs, DSH terminals, LifecycleOwnerRegistry, ProcessOriginRegistry, WindowsListenerScanner, and RuntimeInspectorHost visibly distinct.
- Preserve the internal/get seam branch and the provider-read-bypass branch as mutually exclusive alternatives.
- Preserve the background Job and persistent Terminal opt branches as optional events.
- Preserve the distinction between recording a verified Process origin and later scanning or matching it.
- Simplify low-value payload detail only when needed; never remove a participant, branch, or key message.

## Layout Requirements

Use a time-oriented spatial composition:

- Place the 12 participant labels in a clear horizontal row or shallow diagonal at the top.
- Let time flow from top to bottom through thin orthogonal message lines.
- Make the RuntimeAttribution lane the visual center of gravity.
- Place DSH Session and Cordis event seams on the left, dispatcher and Tool body next, then subprocess provider.
- Place Jobs, Terminals, LifecycleOwnerRegistry, and ProcessOriginRegistry in the central-to-lower ownership area.
- Place WindowsListenerScanner and RuntimeInspectorHost toward the lower-right endpoint.
- Render the internal/get versus provider-bypass alternatives as two lightly layered branch frames, not as extra participants.
- Render the background Job and persistent Terminal options as small subordinate branch panels.
- Keep solid call arrows and dashed return arrows visually distinct.
- Preserve the final path: listener rows and attribution status.
- Do not add duplicate arrows merely to decorate the timeline.

## Spatial Illustration Style

Do not present the result as a plain flat sequence diagram.

Instead, reinterpret it as a refined spatial technical illustration:

- Use a wide wireframe timeline with lightly layered participant planes.
- Use subtle pseudo-3D depth through offset lane borders, shallow oblique panels, and floating branch frames.
- Keep participant names and message labels on flat, front-facing editorial surfaces.
- Make the RuntimeAttribution lane a deeper, ink-blue-edged structural plane; keep all other lanes neutral or lightly tinted.
- Use branch frames for alt, else, and opt blocks with restrained wireframe depth.
- Keep message paths thin, directional, and free of crossings.
- Depth must come from linework and layered borders, never from gradients, highlights, drop shadows, or realistic objects.
- Keep the composition abstract, minimal, chronological, and publication-oriented.

## Kami Visual Style

Follow the visual language of tw93/Kami:

- warm parchment paper background, #f5f4ed, never pure white
- ink blue, #1B365D, as the only accent color
- concentrate ink blue on RuntimeAttribution and use a pale blue tint on RuntimeInspectorHost
- all other lanes and participants use warm ivory surfaces, warm gray borders, and a yellow-brown undertone
- thin geometric single-line strokes
- simple flat shapes with subtle dimensional layering
- elegant serif-led typography
- restrained mono lettering only for code-like tokens such as internal/get, spawn(spec), and callId
- generous whitespace around branch frames
- scientific paper figure aesthetic
- calm, precise visual tone
- consistent wireframe depth and line weight

## Legend and Explanatory Elements

Include a compact horizontal legend outside the main timeline, ideally as a strip at the bottom.

The legend should explain only the visual grammar used in this figure:

- ink-blue focal lane: RuntimeAttribution, the attribution center
- pale blue boundary: RuntimeInspectorHost
- solid arrow: call or forward execution message
- dashed arrow: return, observation result, or callback message
- branch frame: alternative or optional sequence path

Use minimal flat swatches or token-like line markers. Keep the legend quiet and subordinate. Do not add legend entries for nonexistent participants or APIs.

## Text Rendering

Use only essential labels.

Prefer:

- exact participant names
- exact branch labels
- short message labels
- key identifiers and lifecycle terms

Render all participant names exactly and case-sensitively:

- DSH Session
- Cordis event seams
- RuntimeAttribution
- DSH Tool dispatcher
- Tool body
- subprocess provider
- DSH jobs
- DSH terminals
- LifecycleOwnerRegistry
- ProcessOriginRegistry
- WindowsListenerScanner
- RuntimeInspectorHost

Preserve key message labels such as:

- publish session/event(tool/call)
- observeSessionEvent(subject, event)
- cache Session, Call ID, root Call ID, Turn, Step, Tool
- tools/execute(execution, next)
- beginExecution(agent, callId)
- snapshot list(owner)
- lookup subprocess service
- internal/get(subprocess, next)
- call next() for original service
- non-mutating decorated Proxy
- reversible spawn method wrapper already installed
- spawn(spec) or spawnTerminal(spec)
- read PID and Windows creation identity
- record verified Process origin
- associate new jobId with captured origin
- associate terminalSessionId
- tools/result(execution, value)
- finish(structured jobId cross-check)
- scanWithStatus(origins)
- match PID ancestry and creation identity
- listener rows and attribution status

Avoid full method lists, long prose, and raw Mermaid syntax. If the labels become crowded, remove secondary payload wording before removing participant names, branch labels, or the final attribution result.

## Avoid

Do not use:

- photorealistic 3D rendering
- glossy 3D objects
- realistic photos
- colorful UI dashboard style
- gradients
- neon colors
- excessive decoration
- cyberpunk style
- cluttered infographic style
- game-like environment
- invented participants or process-tree components
- a simultaneous replacement of both subprocess observation seams
- a plain UML or sequence screenshot
- crossing message lines
- a legend floating over the timeline

## Output

Create a standalone technical illustration suitable for:

Technical documentation, Markdown embedding, and a GitHub-style attribution-flow explanation.

Aspect ratio:
16:9

Quality:
High resolution, publication-quality figure. Target output 2400×1350 px, with all essential labels legible at approximately 960 px display width.

---

## Prompt 6 — 安全处理决策图

You are an expert technical illustrator.

Generate a Kami-style spatial technical illustration based on the provided diagram source and project context.

## Context

Project:
DSH Runtime Inspector

Description:
A same-repository DeepSeek Harness (DSH) Bundle for Windows local development. It observes TCP listeners, correlates Windows process identity and ancestry with DSH Sessions and Tool Calls when the required capabilities are available, and exposes Host-owned inspection and safe handling in DSH Web. It does not replace DSH lifecycle management, replace subprocess providers, or act as a general task manager.

Purpose:
A standalone technical documentation illustration showing that all actions are decided in the Host after a fresh scan, row validation, explicit confirmation, lifecycle-owner checks, external PID revalidation, and a fresh post-action scan.

## Source Diagram

The following flowchart defines the system structure:

~~~mermaid
flowchart TD
    Request["Host action request<br/>Browser RPC or service call"] --> Fresh{"Fresh scan complete?"}
    Fresh -- "No" --> ReadOnly["Read-only<br/>do not dispatch action"]
    Fresh -- "Yes" --> Operation{"Requested operation?"}

    Operation -- "inventory / port_list" --> Redacted["Return bounded,<br/>redacted inventory"]
    Operation -- "action" --> Stale{"Row and action still<br/>match fresh scan?"}
    Stale -- "No" --> RejectStale["Reject stale request"]
    Stale -- "Yes" --> Confirm{"Explicit confirmation?"}
    Confirm -- "No" --> RejectConfirm["No action"]
    Confirm -- "Yes" --> Managed{"Observing mode and<br/>verified lifecycle owner?"}

    Managed -- "Yes" --> ManagedShutdown["Managed shutdown through DSH<br/>Job kill + bounded wait<br/>or Terminal kill"]
    ManagedShutdown --> ManagedSettled{"Owner settled?"}
    ManagedSettled -- "No" --> ManagedFailure["Report failure<br/>never escalate to PID kill"]
    ManagedSettled -- "Yes" --> PostScan["Fresh post-action scan"]
    ManagedFailure --> PostScan

    Managed -- "No" --> ExternalFields{"PID + creation time +<br/>executable available?"}
    ExternalFields -- "No" --> ReadOnly
    ExternalFields -- "Yes" --> Revalidate["Revalidate immediately:<br/>PID, creation time, executable,<br/>user, protected/system flags,<br/>permission and canTerminate"]
    Revalidate -- "Fail" --> Blocked["Remain read-only / blocked"]
    Revalidate -- "Pass" --> ExternalKill["Terminate one selected PID only<br/>no process-tree kill"]
    ExternalKill --> PostScan

    PostScan --> Released{"Port released?"}
    Released -- "Yes" --> Success["Report success<br/>portReleased = true"]
    Released -- "No" --> StillListening["Report result<br/>listener still present"]
~~~

## Visualization Goal

Transform this flowchart into a refined Kami-style spatial editorial technical illustration.

Do not simply draw a plain flat decision flowchart. Reinterpret it as a clear, calm safety-decision figure that makes the Host-only action boundary and the fail-closed branches immediately understandable.

The reader should see the sequence:

fresh scan gate → requested operation → row and action validation → explicit confirmation → managed DSH shutdown or external single-PID revalidation → fresh post-action scan → port release result.

## Structure Requirements

- Preserve every source node, decision, branch label, relationship direction, relationship label, and terminal outcome.
- Do not invent new components, browser privileges, process-tree actions, batch operations, or automatic cleanup behavior.
- Make Fresh scan complete? the primary focal decision.
- Make Revalidate the secondary focal decision or safety boundary.
- Keep inventory / port_list as a read-only path.
- Keep action as a separate path requiring row and action freshness plus explicit confirmation.
- Keep Managed shutdown through DSH Job or Terminal operations distinct from ExternalKill.
- Preserve the branch ManagedSettled = No → ManagedFailure → PostScan, with no escalation to PID kill.
- Preserve the external branch requiring PID, creation time, executable, user, protected/system flags, permission, and canTerminate checks.
- Preserve ExternalKill as one selected PID only with no process-tree kill.
- Preserve the final Port released? decision and both result states.
- Simplify low-value line wrapping only when needed; never remove a decision, branch, or terminal state.

## Layout Requirements

Use a clear top-to-bottom decision composition:

- Top: Host action request.
- First focal gate: Fresh scan complete?
- Next: Requested operation?
- Left branch: inventory / port_list → bounded redacted inventory.
- Center branch: action → fresh row match → explicit confirmation → managed DSH path.
- Right branch: external fields → immediate revalidation → one selected PID only.
- Lower center: fresh post-action scan.
- Bottom: Port released? leading to success or listener-still-present result.
- Group the figure into lightly outlined spatial regions named Freshness Gate, Operation and Confirmation, Managed DSH Path, External PID Path, and Post-action Verification. These are grouping captions, not new nodes.
- Use thin directional arrows, clear yes/no labels, and generous branch spacing.
- Avoid crossing lines; route branches around decision blocks rather than through them.
- Do not add duplicate flow arrows or decorative warning symbols.

## Spatial Illustration Style

Do not present the result as a plain flat flowchart.

Instead, reinterpret it as a refined spatial technical illustration:

- Use layered wireframe decision planes or lightly oblique slabs for the major gates.
- Use a central safety corridor from Fresh scan complete? to PostScan.
- Use two distinct side corridors for Managed shutdown and ExternalKill.
- Use neutral, low-emphasis blocks for read-only, rejected, blocked, failure, and listener-still-present outcomes.
- Use a restrained pseudo-3D offset behind the focal decision planes to create spatial hierarchy.
- Keep all decision and action labels on flat, front-facing panels.
- Depth must come from linework and layered borders, never gradients, highlights, shadows, or realistic objects.
- Keep the result diagrammatic, minimal, calm, and suitable for a technical paper or Markdown figure.

## Kami Visual Style

Follow the visual language of tw93/Kami:

- warm parchment paper background, #f5f4ed, never pure white
- ink blue, #1B365D, as the only accent color
- concentrate ink blue on Fresh scan complete? and use a pale blue tint on Revalidate
- all normal action and result nodes use warm ivory surfaces and warm gray borders
- read-only, rejected, blocked, and failure outcomes use restrained warm gray emphasis, never a second accent color
- thin geometric single-line strokes
- simple flat shapes with subtle dimensional layering
- elegant serif-led typography
- restrained mono lettering only for code-like tokens such as port_list, portReleased = true, PID, and canTerminate
- generous whitespace around decision branches
- scientific paper figure aesthetic
- calm, precise, safety-oriented visual tone
- consistent wireframe depth and line weight

## Legend and Explanatory Elements

Include a compact horizontal legend outside the main decision area, ideally as a strip at the bottom.

The legend should explain only the visual grammar used in this figure:

- ink-blue decision: primary safety gate
- pale blue decision: immediate revalidation boundary
- warm ivory block: normal operation or result
- warm gray block: read-only, rejected, blocked, failed, or not-yet-released outcome
- thin arrow: controlled decision flow
- yes/no labels: explicit branch conditions from the source

Use minimal flat swatches or token-like line markers. Keep the legend quiet, aligned, and subordinate. Do not introduce any component or action absent from the source diagram.

## Text Rendering

Use only essential labels.

Preserve exact decision and node labels, including:

- Host action request
- Fresh scan complete?
- Read-only
- do not dispatch action
- Requested operation?
- inventory / port_list
- Return bounded, redacted inventory
- action
- Row and action still match fresh scan?
- Reject stale request
- Explicit confirmation?
- No action
- Observing mode and verified lifecycle owner?
- Managed shutdown through DSH
- Job kill + bounded wait
- or Terminal kill
- Owner settled?
- Report failure
- never escalate to PID kill
- Fresh post-action scan
- PID + creation time + executable available?
- Revalidate immediately
- PID, creation time, executable, user, protected/system flags, permission and canTerminate
- Remain read-only / blocked
- Terminate one selected PID only
- no process-tree kill
- Port released?
- Report success
- portReleased = true
- Report result
- listener still present

Do not render long prose paragraphs or raw Mermaid syntax. Keep yes/no branch labels close to their arrows. If space is limited, preserve decision labels and terminal outcomes before secondary line breaks.

## Avoid

Do not use:

- photorealistic 3D rendering
- glossy 3D objects
- realistic photos
- colorful UI dashboard style
- gradients
- neon colors
- excessive decoration
- cyberpunk style
- cluttered infographic style
- game-like environment
- automatic cleanup or batch termination claims
- process-tree kill actions
- fallback from managed failure to external termination
- Browser-controlled authority
- a plain unstructured flowchart screenshot
- crossing connectors
- warning icons that are not present in the source
- a legend placed inside the decision path

## Output

Create a standalone technical illustration suitable for:

Technical documentation, Markdown embedding, and a GitHub-style safety-decision explanation.

Aspect ratio:
16:9

Quality:
High resolution, publication-quality figure. Target output 2400×1350 px, with all essential labels legible at approximately 960 px display width.

