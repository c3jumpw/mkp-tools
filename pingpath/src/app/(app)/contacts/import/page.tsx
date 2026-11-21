"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { parseCsv } from "@/lib/csv";
import { bulkImportContacts, type ImportRow } from "@/app/(app)/contacts/actions";

const FIELDS = [
  { key: "full_name", label: "Full name" },
  { key: "nickname", label: "Nickname" },
  { key: "phone", label: "Phone" },
  { key: "phone2", label: "Phone 2" },
  { key: "instagram_handle", label: "Instagram handle" },
  { key: "tiktok_handle", label: "TikTok handle" },
  { key: "email", label: "Email" },
  { key: "notes", label: "Notes" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

function guessMapping(headers: string[]): Record<FieldKey, number> {
  const lower = headers.map((h) => h.toLowerCase());
  const find = (...needles: string[]) =>
    lower.findIndex((h) => needles.some((n) => h.includes(n)));
  return {
    full_name: find("name"),
    nickname: find("nickname", "nick name"),
    phone: find("phone", "mobile", "cell"),
    phone2: find("phone 2", "phone2", "second phone", "work phone"),
    instagram_handle: find("instagram", "insta", "ig"),
    tiktok_handle: find("tiktok", "tik tok"),
    email: find("e-mail", "email"),
    notes: find("note"),
  };
}

export default function ImportPage() {
  const router = useRouter();
  const [raw, setRaw] = useState("");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(
    null
  );
  const [error, setError] = useState("");

  const parsed = useMemo(() => (raw.trim() ? parseCsv(raw) : []), [raw]);
  const headers = parsed[0] || [];
  const dataRows = parsed.slice(1);
  const [mapping, setMapping] = useState<Record<FieldKey, number> | null>(null);

  const activeMapping = mapping || guessMapping(headers);

  function handleFile(file: File) {
    file.text().then(setRaw);
  }

  function handleImport() {
    if (activeMapping.full_name < 0) {
      setError("Map a column to Full name before importing.");
      return;
    }
    setError("");
    const rows: ImportRow[] = dataRows.map((r) => ({
      full_name: r[activeMapping.full_name] || "",
      nickname: activeMapping.nickname >= 0 ? r[activeMapping.nickname] : undefined,
      phone: activeMapping.phone >= 0 ? r[activeMapping.phone] : undefined,
      phone2: activeMapping.phone2 >= 0 ? r[activeMapping.phone2] : undefined,
      instagram_handle:
        activeMapping.instagram_handle >= 0 ? r[activeMapping.instagram_handle] : undefined,
      tiktok_handle:
        activeMapping.tiktok_handle >= 0 ? r[activeMapping.tiktok_handle] : undefined,
      email: activeMapping.email >= 0 ? r[activeMapping.email] : undefined,
      notes: activeMapping.notes >= 0 ? r[activeMapping.notes] : undefined,
    }));
    startTransition(async () => {
      const res = await bulkImportContacts(rows);
      setResult(res);
    });
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto pb-24">
      <Link href="/contacts" className="text-sm text-muted hover:text-ink">
        ← All contacts
      </Link>
      <h1 className="font-display text-2xl md:text-3xl mt-3 mb-2">Import contacts</h1>
      <p className="text-sm text-muted mb-6">
        Export your contacts as CSV from Google Contacts, iCloud, or your phone, then
        paste or upload it here.
      </p>

      {result ? (
        <div className="rounded-xl border border-moss/40 bg-moss/10 p-5">
          <p className="text-sm">
            Imported <strong>{result.imported}</strong> contact
            {result.imported === 1 ? "" : "s"}.{" "}
            {result.skipped > 0 && `Skipped ${result.skipped} duplicate phone number(s).`}
          </p>
          <div className="flex gap-2 mt-4">
            <button
              onClick={() => router.push("/contacts")}
              className="text-sm px-4 py-2 rounded-lg bg-accent text-bg font-medium"
            >
              View contacts
            </button>
            <button
              onClick={() => {
                setResult(null);
                setRaw("");
              }}
              className="text-sm px-4 py-2 rounded-lg border border-line"
            >
              Import more
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <label className="inline-block text-sm px-3 py-2 rounded-lg border border-line cursor-pointer hover:border-ink/40">
              Choose CSV file
              <input
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              />
            </label>
          </div>

          <textarea
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            placeholder="Or paste CSV text here — first row should be headers."
            rows={5}
            className="w-full rounded-lg bg-surface border border-line px-3 py-2 text-xs font-mono mb-4 focus:outline-none focus:ring-2 focus:ring-accent/50"
          />

          {headers.length > 0 && (
            <>
              <h2 className="text-sm font-medium mb-2">
                Map columns · {dataRows.length} row{dataRows.length === 1 ? "" : "s"} found
              </h2>
              <div className="grid grid-cols-2 gap-3 mb-4">
                {FIELDS.map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs text-muted mb-1">{f.label}</label>
                    <select
                      value={activeMapping[f.key]}
                      onChange={(e) =>
                        setMapping({
                          ...activeMapping,
                          [f.key]: Number(e.target.value),
                        })
                      }
                      className="w-full rounded-lg bg-surface border border-line px-2 py-1.5 text-sm"
                    >
                      <option value={-1}>— Not mapped —</option>
                      {headers.map((h, i) => (
                        <option key={i} value={i}>
                          {h || `Column ${i + 1}`}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-line overflow-x-auto scroll-thin mb-4">
                <table className="text-xs w-full">
                  <thead className="bg-surface-2 text-muted">
                    <tr>
                      {FIELDS.map((f) => (
                        <th key={f.key} className="text-left px-3 py-2 whitespace-nowrap">
                          {f.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {dataRows.slice(0, 5).map((r, i) => (
                      <tr key={i}>
                        {FIELDS.map((f) => (
                          <td key={f.key} className="px-3 py-2 whitespace-nowrap">
                            {activeMapping[f.key] >= 0 ? r[activeMapping[f.key]] : "—"}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {error && <p className="text-sm text-rust mb-3">{error}</p>}

              <button
                onClick={handleImport}
                disabled={pending}
                className="text-sm px-4 py-2.5 rounded-lg bg-accent text-bg font-medium hover:bg-accent-hover disabled:opacity-60"
              >
                {pending ? "Importing…" : `Import ${dataRows.length} contacts`}
              </button>
            </>
          )}
        </>
      )}
    </div>
  );
}
