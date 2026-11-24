import { Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { api } from '../lib/api';
import type { EcosystemId, TemplateCatalog, ToolCatalog } from '../types';

interface TemplatesToolsPageProps {
  templates: TemplateCatalog;
  tools: ToolCatalog;
  onRefreshState: () => Promise<void>;
}

export function TemplatesToolsPage({
  templates,
  tools,
  onRefreshState,
}: TemplatesToolsPageProps) {
  const [ecoFilter, setEcoFilter] = useState<'all' | EcosystemId>('all');
  const [tplId, setTplId] = useState<string>('');
  const [tplSdk, setTplSdk] = useState<EcosystemId>('php');
  const [tplName, setTplName] = useState<string>('');
  const [tplDesc, setTplDesc] = useState<string>('');
  const [stepTool, setStepTool] = useState<string>('composer');
  const [stepLabel, setStepLabel] = useState<string>('Create project skeleton');
  const [stepArgs, setStepArgs] = useState<string>('create-project vendor/starter {project_path}');
  const [error, setError] = useState<string | null>(null);

  const visibleTemplates = templates.templates.filter(
    (t) => ecoFilter === 'all' || t.sdk === ecoFilter,
  );

  const handleAddTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.upsertTemplate({
        id: tplId || tplName,
        sdk: tplSdk,
        name: tplName,
        description: tplDesc || `${tplName} template`,
        steps: [
          {
            tool: stepTool,
            label: stepLabel,
            arguments: stepArgs.split(/\s+/).filter(Boolean),
          },
        ],
      });
      setTplId('');
      setTplName('');
      setTplDesc('');
      await onRefreshState();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold text-[var(--text-primary)]">
            Project Templates Catalog (templates.json)
          </h2>
          <p className="text-xs text-[var(--text-muted)]">
            Declarative scaffold steps served to PySide6 desktop clients via /api/v1/templates.json.
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)]">
          {(['all', 'php', 'node', 'python', 'flutter'] as const).map((eco) => (
            <button
              key={eco}
              type="button"
              onClick={() => setEcoFilter(eco)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium whitespace-nowrap ${
                ecoFilter === eco
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {eco === 'all' ? 'All' : eco === 'node' ? 'Node.js' : eco.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Add Custom Template */}
      <form
        onSubmit={handleAddTemplate}
        className="p-5 rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] space-y-3"
      >
        <div className="text-xs font-medium text-[var(--text-secondary)]">
          Publish New Template to templates.json
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <select
            value={tplSdk}
            onChange={(e) => setTplSdk(e.target.value as EcosystemId)}
            className="px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
          >
            <option value="php">PHP</option>
            <option value="node">Node.js</option>
            <option value="python">Python</option>
            <option value="flutter">Flutter</option>
          </select>
          <input
            type="text"
            value={tplId}
            onChange={(e) => setTplId(e.target.value)}
            placeholder="template-id (e.g. slim-api)"
            className="px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
          />
          <input
            type="text"
            required
            value={tplName}
            onChange={(e) => setTplName(e.target.value)}
            placeholder="Display Name (e.g. Slim API)"
            className="px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
          />
          <input
            type="text"
            value={tplDesc}
            onChange={(e) => setTplDesc(e.target.value)}
            placeholder="Short description"
            className="px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <select
            value={stepTool}
            onChange={(e) => setStepTool(e.target.value)}
            className="sm:col-span-2 px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
          >
            {['composer', 'php', 'npm', 'npx', 'pip', 'venv', 'flutter', 'git'].map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            type="text"
            value={stepLabel}
            onChange={(e) => setStepLabel(e.target.value)}
            placeholder="Step description"
            className="sm:col-span-4 px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] text-xs text-[var(--text-primary)]"
          />
          <input
            type="text"
            value={stepArgs}
            onChange={(e) => setStepArgs(e.target.value)}
            placeholder="Arguments ({project_name}, {project_path})"
            className="sm:col-span-4 px-3 py-2 rounded bg-[var(--bg-canvas)] border border-[var(--border-hairline)] font-mono text-xs text-[var(--text-primary)]"
          />
          <button
            type="submit"
            className="sm:col-span-2 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-medium whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Publish</span>
          </button>
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}
      </form>

      {/* Templates Table */}
      <section className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] divide-y divide-[var(--border-hairline)]">
        {visibleTemplates.map((tpl) => (
          <div key={tpl.id} className="px-5 py-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-display font-semibold text-[var(--text-primary)]">{tpl.name}</span>
                <span className="text-xs text-[var(--text-muted)]">·</span>
                <span className="font-mono text-xs text-[var(--accent)]">{tpl.sdk}</span>
                <span className="text-xs text-[var(--text-muted)]">·</span>
                <span className="font-mono text-xs text-[var(--text-muted)]">{tpl.id}</span>
              </div>
              <p className="mt-0.5 text-xs text-[var(--text-secondary)]">{tpl.description}</p>
              <div className="mt-2 space-y-1 font-mono text-xs text-[var(--text-muted)]">
                {tpl.steps.map((s, idx) => (
                  <div key={idx} className="truncate">
                    {idx + 1}. [{s.tool}] {s.label}: {s.tool} {s.arguments.join(' ')}
                  </div>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await api.deleteTemplate(tpl.id);
                await onRefreshState();
              }}
              aria-label={`Delete template ${tpl.name}`}
              className="p-1.5 rounded border border-[var(--border-hairline)] hover:border-red-500/40 text-[var(--text-muted)] hover:text-red-500 self-start lg:self-center"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </section>

      {/* Tools Catalog Reference */}
      <section className="rounded-lg bg-[var(--bg-surface)] border border-[var(--border-hairline)] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-[var(--border-hairline)]">
          <h3 className="font-display text-sm font-semibold text-[var(--text-primary)]">
            Managed Tools Catalog (tools.json)
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-[var(--border-hairline)] text-[var(--text-muted)]">
                <th className="py-2.5 px-5">Tool</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Parent SDK</th>
                <th className="py-2.5 px-4">Executable</th>
                <th className="py-2.5 px-5">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-hairline)]">
              {tools.tools.map((tool) => (
                <tr key={tool.id}>
                  <td className="py-2.5 px-5 font-mono font-medium text-[var(--text-primary)]">{tool.name}</td>
                  <td className="py-2.5 px-4 text-[var(--text-secondary)]">{tool.kind}</td>
                  <td className="py-2.5 px-4 font-mono text-[var(--text-secondary)]">{tool.sdk_id}</td>
                  <td className="py-2.5 px-4 font-mono text-[var(--text-primary)]">{tool.executable}</td>
                  <td className="py-2.5 px-5 text-[var(--text-secondary)]">{tool.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
