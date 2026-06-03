'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, Terminal } from 'lucide-react';
import { Card, CardBody, CardHeader } from './ui/card';
import { Badge } from './ui/badge';
import { Table, THead, TH, TD, TR } from './ui/table';
import { cn } from '@/lib/utils';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tu-dominio.com').replace(/\/+$/, '');
const ENDPOINT = `${API_BASE}/v1/messages`;

type Lang = 'curl' | 'node' | 'php' | 'python';
const LANGS: { id: Lang; label: string }[] = [
  { id: 'curl', label: 'cURL' },
  { id: 'node', label: 'Node.js' },
  { id: 'php', label: 'PHP' },
  { id: 'python', label: 'Python' },
];

const textExample: Record<Lang, string> = {
  curl: `curl -X POST ${ENDPOINT} \\
  -H "Authorization: Bearer pk_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "573001112233",
    "content": { "type": "text", "text": "Hola 👋" },
    "externalId": "order-8842"
  }'`,
  node: `const res = await fetch("${ENDPOINT}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer pk_live_••••",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    to: "573001112233",
    content: { type: "text", text: "Hola 👋" },
    externalId: "order-8842",
  }),
});
const data = await res.json();
console.log(data); // { messageId, status: "queued", ... }`,
  php: `<?php
$ch = curl_init("${ENDPOINT}");
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => [
    "Authorization: Bearer pk_live_••••",
    "Content-Type: application/json",
  ],
  CURLOPT_POSTFIELDS => json_encode([
    "to" => "573001112233",
    "content" => ["type" => "text", "text" => "Hola 👋"],
    "externalId" => "order-8842",
  ]),
]);
$response = curl_exec($ch);
curl_close($ch);
echo $response;`,
  python: `import requests

resp = requests.post(
    "${ENDPOINT}",
    headers={"Authorization": "Bearer pk_live_••••"},
    json={
        "to": "573001112233",
        "content": {"type": "text", "text": "Hola 👋"},
        "externalId": "order-8842",
    },
)
print(resp.status_code, resp.json())`,
};

const mediaExample: Record<Lang, string> = {
  curl: `curl -X POST ${ENDPOINT} \\
  -H "Authorization: Bearer pk_live_••••" \\
  -H "Content-Type: application/json" \\
  -d '{
    "to": "573001112233",
    "content": {
      "type": "image",
      "media": "https://example.com/factura.png",
      "text": "Tu factura de junio"
    }
  }'`,
  node: `await fetch("${ENDPOINT}", {
  method: "POST",
  headers: {
    "Authorization": "Bearer pk_live_••••",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    to: "573001112233",
    content: {
      type: "image",
      media: "https://example.com/factura.png",
      text: "Tu factura de junio",
    },
  }),
});`,
  php: `<?php
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
  "to" => "573001112233",
  "content" => [
    "type" => "image",
    "media" => "https://example.com/factura.png",
    "text" => "Tu factura de junio",
  ],
]));`,
  python: `requests.post(
    "${ENDPOINT}",
    headers={"Authorization": "Bearer pk_live_••••"},
    json={
        "to": "573001112233",
        "content": {
            "type": "image",
            "media": "https://example.com/factura.png",
            "text": "Tu factura de junio",
        },
    },
)`,
};

const responseExample = `{
  "messageId": "9f2c1a7e-…",
  "status": "queued",
  "channelId": "a1b2c3d4-…",
  "externalId": "order-8842"
}`;

const statusExample = `curl ${API_BASE}/v1/messages/9f2c1a7e-… \\
  -H "Authorization: Bearer pk_live_••••"`;

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const t = useTranslations('docs');
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }
  return (
    <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900">
      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5">
        <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
          <Terminal className="h-3.5 w-3.5" />
          {label}
        </span>
        <button
          onClick={copy}
          className="flex items-center gap-1 rounded px-2 py-1 text-xs text-slate-300 transition hover:bg-slate-800"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-brand-400" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? t('copied') : t('copy')}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-xs leading-relaxed text-slate-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function Field({
  name,
  type,
  required,
  desc,
}: {
  name: string;
  type: string;
  required?: boolean;
  desc: string;
}) {
  const t = useTranslations('docs');
  return (
    <TR>
      <TD className="whitespace-nowrap">
        <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-800">
          {name}
        </code>
      </TD>
      <TD className="whitespace-nowrap text-xs text-slate-500">{type}</TD>
      <TD>
        <Badge tone={required ? 'warning' : 'neutral'}>{required ? t('req') : t('opt')}</Badge>
      </TD>
      <TD className="text-slate-600">{desc}</TD>
    </TR>
  );
}

export function IntegrationDocs() {
  const t = useTranslations('docs');
  const [lang, setLang] = useState<Lang>('curl');

  return (
    <div className="mt-10">
      <div className="mb-4">
        <h2 className="text-xl font-bold text-slate-900">{t('title')}</h2>
        <p className="mt-1 text-sm text-slate-500">{t('subtitle')}</p>
      </div>

      <div className="space-y-6">
        {/* Quick start */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">{t('quickStart')}</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-slate-500">{t('baseUrl')}:</span>
              <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-800">{API_BASE}</code>
            </div>
            <p className="text-sm text-slate-600">{t('jsonNote')}</p>
          </CardBody>
        </Card>

        {/* Auth */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">{t('auth')}</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-600">{t('authDesc')}</p>
            <CodeBlock
              label="HTTP headers"
              code={`Authorization: Bearer pk_live_••••\n# o / or\nx-api-key: pk_live_••••`}
            />
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
              {t('authNote')}
            </div>
          </CardBody>
        </Card>

        {/* Send a message */}
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone="success">POST</Badge>
              <code className="text-sm font-medium text-slate-800">/v1/messages</code>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-slate-600">{t('sendDesc')}</p>

            <h4 className="text-sm font-semibold text-slate-800">{t('requestFields')}</h4>
            <Table>
              <THead>
                <tr>
                  <TH>{t('field')}</TH>
                  <TH>{t('type')}</TH>
                  <TH>{t('req')}</TH>
                  <TH>{t('description')}</TH>
                </tr>
              </THead>
              <tbody>
                <Field name="to" type="string" required desc={t('f_to')} />
                <Field name="content" type="object" required desc={t('f_content')} />
                <Field name="content.type" type="string" required desc={t('f_contentType')} />
                <Field name="content.text" type="string" desc={t('f_text')} />
                <Field name="content.media" type="string" desc={t('f_media')} />
                <Field name="content.fileName" type="string" desc={t('f_fileName')} />
                <Field name="content.mimeType" type="string" desc={t('f_mimeType')} />
                <Field name="replyTo" type="string" desc={t('f_replyTo')} />
                <Field name="quotedMessageId" type="string" desc={t('f_quoted')} />
                <Field name="channelId" type="uuid" desc={t('f_channelId')} />
                <Field name="externalId" type="string" desc={t('f_externalId')} />
                <Field name="metadata" type="object" desc={t('f_metadata')} />
              </tbody>
            </Table>

            <div className="rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
              <span className="font-semibold text-slate-800">{t('contentTypes')}: </span>
              {t('contentTypesDesc')}
            </div>
          </CardBody>
        </Card>

        {/* Code examples */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">{t('examples')}</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="flex flex-wrap gap-1 rounded-lg bg-slate-100 p-1">
              {LANGS.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLang(l.id)}
                  className={cn(
                    'rounded-md px-3 py-1.5 text-sm font-medium transition',
                    lang === l.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700',
                  )}
                >
                  {l.label}
                </button>
              ))}
            </div>
            <CodeBlock label={t('exampleText')} code={textExample[lang]} />
            <CodeBlock label={t('exampleMedia')} code={mediaExample[lang]} />
          </CardBody>
        </Card>

        {/* Response & lifecycle */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">{t('responseTitle')}</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-slate-600">{t('responseDesc')}</p>
            <CodeBlock label="202 Accepted" code={responseExample} />

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-800">{t('lifecycle')}</h4>
              <div className="flex flex-wrap items-center gap-2">
                {['queued', 'sending', 'sent', 'delivered', 'read'].map((s, i) => (
                  <span key={s} className="flex items-center gap-2">
                    {i > 0 && <span className="text-slate-300">→</span>}
                    <Badge tone={i >= 3 ? 'success' : 'info'}>{s}</Badge>
                  </span>
                ))}
                <span className="text-slate-300">/</span>
                <Badge tone="danger">failed</Badge>
              </div>
              <p className="mt-2 text-xs text-slate-500">{t('lifecycleDesc')}</p>
            </div>

            <div>
              <h4 className="mb-2 text-sm font-semibold text-slate-800">{t('checkStatus')}</h4>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <Badge tone="info">GET</Badge>
                <code className="text-sm text-slate-800">/v1/messages/{'{id}'}</code>
              </div>
              <CodeBlock label="cURL" code={statusExample} />
            </div>
          </CardBody>
        </Card>

        {/* Errors */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">{t('errorsTitle')}</h3>
          </CardHeader>
          <CardBody className="space-y-3">
            <p className="text-sm text-slate-600">{t('errorsDesc')}</p>
            <Table>
              <THead>
                <tr>
                  <TH>{t('httpStatus')}</TH>
                  <TH>{t('code')}</TH>
                  <TH>{t('meaning')}</TH>
                </tr>
              </THead>
              <tbody>
                {[
                  ['401', 'auth.invalid_api_key', t('e_invalidKey')],
                  ['403', 'auth.key_revoked', t('e_revoked')],
                  ['422', 'validation.invalid_phone', t('e_invalidPhone')],
                  ['422', 'channel.no_channel_available', t('e_noChannel')],
                  ['409', 'message.duplicate_external_id', t('e_duplicate')],
                  ['429', 'rate.too_many_requests', t('e_rate')],
                ].map(([http, code, meaning]) => (
                  <TR key={code}>
                    <TD>
                      <Badge tone="neutral">{http}</Badge>
                    </TD>
                    <TD className="whitespace-nowrap">
                      <code className="text-xs text-slate-700">{code}</code>
                    </TD>
                    <TD className="text-slate-600">{meaning}</TD>
                  </TR>
                ))}
              </tbody>
            </Table>
          </CardBody>
        </Card>

        {/* Best practices */}
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-slate-900">{t('bestPractices')}</h3>
          </CardHeader>
          <CardBody>
            <ul className="list-disc space-y-2 pl-5 text-sm text-slate-600">
              <li>{t('bp1')}</li>
              <li>{t('bp2')}</li>
              <li>{t('bp3')}</li>
              <li>{t('bp4')}</li>
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
