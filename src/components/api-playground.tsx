'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { AlertTriangle, Check, ChevronDown, Copy, Send } from 'lucide-react';
import { Card, CardBody, CardHeader } from './ui/card';
import { Input, Select } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';
import { api, API_URL } from '@/lib/api';
import type { Channel } from '@/lib/types';

const TYPES = ['text', 'image', 'video', 'audio', 'document', 'sticker'];
const CAPTION_TYPES = ['text', 'image', 'video', 'document'];

interface FormState {
  to: string;
  type: string;
  text: string;
  media: string;
  fileName: string;
  mimeType: string;
  replyTo: string;
  channelId: string;
  externalId: string;
  metadata: string;
}

const EMPTY: FormState = {
  to: '',
  type: 'text',
  text: 'Hola 👋 Este es un mensaje de prueba.',
  media: '',
  fileName: '',
  mimeType: '',
  replyTo: '',
  channelId: '',
  externalId: '',
  metadata: '',
};

export function ApiPlayground({
  apiKey,
  onApiKeyChange,
}: {
  apiKey: string;
  onApiKeyChange: (v: string) => void;
}) {
  const t = useTranslations('playground');
  const [form, setForm] = useState<FormState>(EMPTY);
  const [advanced, setAdvanced] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ status: number; body: any } | null>(null);
  const [copied, setCopied] = useState(false);

  const channels = useQuery({
    queryKey: ['channels'],
    queryFn: async () => (await api.get<Channel[]>('/channels')).data,
  });

  const set = (k: keyof FormState, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const showCaption = CAPTION_TYPES.includes(form.type);
  const showMedia = form.type !== 'text';

  function applyScenario(id: string) {
    const base = { ...EMPTY, to: form.to, channelId: form.channelId };
    switch (id) {
      case 'text':
        setForm({ ...base, type: 'text', text: 'Hola 👋 Este es un mensaje de prueba.' });
        break;
      case 'reply':
        setForm({
          ...base,
          type: 'text',
          text: 'Hola 👋 ¿En qué podemos ayudarte?',
          replyTo: '573009998877',
        });
        setAdvanced(true);
        break;
      case 'image':
        setForm({
          ...base,
          type: 'image',
          media: 'https://picsum.photos/600/400',
          text: 'Imagen de prueba 📷',
        });
        break;
      case 'document':
        setForm({
          ...base,
          type: 'document',
          media: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
          fileName: 'documento-prueba.pdf',
          mimeType: 'application/pdf',
          text: 'Aquí tienes tu documento',
        });
        break;
      case 'audio':
        setForm({
          ...base,
          type: 'audio',
          media: 'https://file-examples.com/storage/fe8c7eef0c6364f6c9504cc/2017/11/file_example_MP3_700KB.mp3',
        });
        break;
      case 'sticker':
        setForm({
          ...base,
          type: 'sticker',
          media: 'https://raw.githubusercontent.com/WhatsApp/stickers/main/Android/app/src/main/assets/1/01_Cuppy_smile.webp',
        });
        break;
    }
    setResult(null);
  }

  function buildPayload() {
    const content: any = { type: form.type };
    if (form.type === 'text') {
      content.text = form.text;
    } else {
      content.media = form.media;
      if (form.text && CAPTION_TYPES.includes(form.type)) content.text = form.text;
      if (form.fileName) content.fileName = form.fileName;
      if (form.mimeType) content.mimeType = form.mimeType;
    }
    const payload: any = { to: form.to, content };
    if (form.replyTo) payload.replyTo = form.replyTo;
    if (form.channelId) payload.channelId = form.channelId;
    if (form.externalId) payload.externalId = form.externalId;
    if (form.metadata.trim()) payload.metadata = JSON.parse(form.metadata);
    return payload;
  }

  const curl = useMemo(() => {
    let payload: any;
    try {
      payload = buildPayload();
    } catch {
      return '';
    }
    const keyShown = apiKey.trim() ? `${apiKey.trim().slice(0, 12)}…` : 'pk_live_••••';
    return `curl -X POST ${API_URL}/v1/messages \\
  -H "Authorization: Bearer ${keyShown}" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, apiKey]);

  async function send() {
    if (!apiKey.trim()) return setResult({ status: 0, body: { error: t('missingKey') } });
    if (!form.to.trim()) return setResult({ status: 0, body: { error: t('missingTo') } });
    let payload: any;
    try {
      payload = buildPayload();
    } catch {
      return setResult({ status: 0, body: { error: t('invalidMetadata') } });
    }
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`${API_URL}/v1/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: JSON.stringify(payload),
      });
      let body: any = {};
      try {
        body = await res.json();
      } catch {
        /* empty body */
      }
      setResult({ status: res.status, body });
    } catch {
      setResult({ status: 0, body: { error: t('networkError') } });
    } finally {
      setLoading(false);
    }
  }

  function copyCurl() {
    navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const ok = result && result.status >= 200 && result.status < 300;

  const scenarios = [
    { id: 'text', label: t('scText') },
    { id: 'reply', label: t('scReply') },
    { id: 'image', label: t('scImage') },
    { id: 'document', label: t('scDocument') },
    { id: 'audio', label: t('scAudio') },
    { id: 'sticker', label: t('scSticker') },
  ];

  return (
    <div className="mt-8">
      <Card>
        <CardHeader>
          <h3 className="font-semibold text-foreground">{t('title')}</h3>
          <p className="mt-0.5 text-sm text-muted-foreground">{t('subtitle')}</p>
        </CardHeader>
        <CardBody className="space-y-5">
          <div className="flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t('warning')}</span>
          </div>

          {/* API key */}
          <Input
            label={t('apiKey')}
            type="password"
            placeholder="pk_live_…"
            hint={t('apiKeyHint')}
            value={apiKey}
            onChange={(e) => onApiKeyChange(e.target.value)}
          />

          {/* Scenarios */}
          <div>
            <p className="label-base">{t('scenarios')}</p>
            <div className="flex flex-wrap gap-2">
              {scenarios.map((s) => (
                <button
                  key={s.id}
                  onClick={() => applyScenario(s.id)}
                  className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:bg-muted hover:text-foreground"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Core fields */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label={t('recipient')}
              placeholder="573001112233"
              hint={t('recipientHint')}
              value={form.to}
              onChange={(e) => set('to', e.target.value)}
            />
            <Select label={t('channel')} value={form.channelId} onChange={(e) => set('channelId', e.target.value)}>
              <option value="">{t('randomChannel')}</option>
              {(channels.data || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.status === 'CONNECTED' ? '✓' : `(${c.status})`}
                </option>
              ))}
            </Select>
            <Select label={t('type')} value={form.type} onChange={(e) => set('type', e.target.value)}>
              {TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {ty}
                </option>
              ))}
            </Select>
            {showMedia && (
              <Input
                label={t('media')}
                placeholder="https://…  /  data:...;base64,…"
                value={form.media}
                onChange={(e) => set('media', e.target.value)}
              />
            )}
          </div>

          {showCaption && (
            <div>
              <label className="label-base">{t('text')}</label>
              <textarea
                className="input-base min-h-[80px] resize-y"
                value={form.text}
                onChange={(e) => set('text', e.target.value)}
              />
            </div>
          )}

          {/* Advanced */}
          <div>
            <button
              onClick={() => setAdvanced((v) => !v)}
              className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ChevronDown className={cn('h-4 w-4 transition', advanced && 'rotate-180')} />
              {t('advanced')}
            </button>
            {advanced && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <Input label={t('replyTo')} placeholder="573009998877" value={form.replyTo} onChange={(e) => set('replyTo', e.target.value)} />
                <Input label={t('externalId')} placeholder="order-8842" value={form.externalId} onChange={(e) => set('externalId', e.target.value)} />
                <Input label={t('fileName')} placeholder="factura.pdf" value={form.fileName} onChange={(e) => set('fileName', e.target.value)} />
                <Input label={t('mimeType')} placeholder="application/pdf" value={form.mimeType} onChange={(e) => set('mimeType', e.target.value)} />
                <div className="sm:col-span-2">
                  <label className="label-base">{t('metadata')}</label>
                  <textarea
                    className="input-base min-h-[64px] resize-y font-mono text-xs"
                    placeholder='{ "campaign": "x" }'
                    value={form.metadata}
                    onChange={(e) => set('metadata', e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end">
            <Button onClick={send} loading={loading} disabled={loading}>
              <Send className="h-4 w-4" /> {loading ? t('sending') : t('send')}
            </Button>
          </div>

          {/* Result */}
          {result && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">{t('response')}</span>
                {result.status > 0 && (
                  <Badge tone={ok ? 'success' : 'danger'}>{result.status}</Badge>
                )}
              </div>
              <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
                <code>{JSON.stringify(result.body, null, 2)}</code>
              </pre>
            </div>
          )}

          {/* cURL preview */}
          {curl && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-foreground">{t('request')}</span>
                <button
                  onClick={copyCurl}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-brand-500" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </div>
              <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900 p-4 text-xs leading-relaxed text-slate-100">
                <code>{curl}</code>
              </pre>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
