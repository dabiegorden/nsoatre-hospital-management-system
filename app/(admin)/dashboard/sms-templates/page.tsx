"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Languages, Loader2, MessageSquareText, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  fillTemplate,
  SMS_PLACEHOLDERS,
  SMS_PURPOSE_LABELS,
  SMS_PURPOSES,
  type SmsPurpose,
} from "@/lib/reminders/template-format";
import { errorMessage } from "@/lib/utils";
import { useCurrentUser } from "@/hooks/use-current-user";
import { canDelete } from "@/lib/roles";

interface Template {
  _id: string;
  name: string;
  message: string;
  purpose: SmsPurpose | null;
  language: "english" | "twi";
  isActive: boolean;
  updatedAt: string;
}

type Form = { name: string; message: string; purpose: SmsPurpose | "none"; language: "english" | "twi" };

const EMPTY: Form = { name: "", message: "", purpose: "missedPatient", language: "twi" };

const PREVIEW_VARS = {
  name: "Akosua",
  date: "Mon 13 Oct, 09:00",
  location: "ANC Clinic",
  dueDate: "20 December",
};

export default function SmsTemplatesPage() {
  // Deleting is admin-only; staff can add and edit.
  const canDeleteRecords = canDelete(useCurrentUser()?.role);

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/sms-templates?all=true", { credentials: "include" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setTemplates(json.data);
    } catch (error) {
      toast.error(errorMessage(error) || "Failed to load templates");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openForm = (template?: Template) => {
    setEditing(template ?? null);
    setForm(
      template
        ? {
            name: template.name,
            message: template.message,
            purpose: template.purpose ?? "none",
            language: template.language,
          }
        : EMPTY
    );
    setOpen(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = { ...form, purpose: form.purpose === "none" ? null : form.purpose };
      const res = await fetch(editing ? `/api/sms-templates/${editing._id}` : "/api/sms-templates", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success(editing ? "Template updated" : "Template created");
      setOpen(false);
      load();
    } catch (error) {
      toast.error(errorMessage(error) || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const patch = async (template: Template, body: Record<string, unknown>) => {
    const res = await fetch(`/api/sms-templates/${template._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (res.ok) load();
    else toast.error((await res.json()).message || "Update failed");
  };

  const remove = async (template: Template) => {
    if (!confirm(`Delete "${template.name}"?`)) return;
    const res = await fetch(`/api/sms-templates/${template._id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (res.ok) {
      toast.success("Template deleted");
      load();
    } else toast.error("Delete failed");
  };

  const covered = (purpose: SmsPurpose) =>
    templates.some((t) => t.purpose === purpose && t.language === "twi" && t.isActive);

  return (
    <div className="p-6 space-y-6 bg-linear-to-br from-emerald-50/30 via-white to-green-50/20 min-h-screen">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-linear-to-r from-emerald-700 to-emerald-500 bg-clip-text text-transparent mb-2">
            SMS Templates
          </h1>
          <p className="text-gray-600 max-w-2xl">
            Write the automatic reminder texts in Twi. Patients who prefer Twi receive the Twi
            template; everyone else, and any message without a Twi template, gets the built-in
            English text.
          </p>
        </div>
        <Button onClick={() => openForm()} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
          <Plus className="w-4 h-4" />
          New template
        </Button>
      </div>

      <Card className="border-0 shadow-lg bg-white">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Languages className="w-5 h-5 text-emerald-600" />
            Twi coverage
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {SMS_PURPOSES.map((p) => (
            <Badge
              key={p}
              className={
                covered(p)
                  ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-100"
              }
            >
              {covered(p) ? "✓" : "—"} {SMS_PURPOSE_LABELS[p]}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-lg bg-white overflow-hidden">
        <CardHeader className="bg-linear-to-r from-emerald-500 to-teal-600">
          <CardTitle className="text-white flex items-center gap-2">
            <MessageSquareText className="w-5 h-5" />
            Templates
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : templates.length === 0 ? (
            <p className="text-center text-gray-500 py-16">
              No templates yet. Create a Twi template for each reminder message.
            </p>
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div key={t._id} className="rounded-xl border border-emerald-100 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <div className="flex flex-wrap gap-2 mt-1">
                        <Badge variant="outline" className="border-emerald-200 text-emerald-700">
                          {t.language === "twi" ? "Twi" : "English"}
                        </Badge>
                        <Badge variant="outline">
                          {t.purpose ? SMS_PURPOSE_LABELS[t.purpose] : "Manual use only"}
                        </Badge>
                        {!t.isActive && <Badge className="bg-gray-100 text-gray-600 hover:bg-gray-100">Inactive</Badge>}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => patch(t, { isActive: !t.isActive })}>
                        {t.isActive ? "Deactivate" : "Activate"}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openForm(t)} aria-label="Edit">
                        <Pencil className="w-4 h-4" />
                      </Button>
                      {canDeleteRecords && (
                        <Button variant="outline" size="sm" onClick={() => remove(t)} aria-label="Delete">
                          <Trash2 className="w-4 h-4 text-rose-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-gray-700 whitespace-pre-wrap">{t.message}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit template" : "New template"}</DialogTitle>
            <DialogDescription>
              Placeholders:{" "}
              {Object.entries(SMS_PLACEHOLDERS).map(([key, label]) => (
                <span key={key} className="mr-2">
                  <code className="text-emerald-700">{key}</code> {label.toLowerCase()}
                </span>
              ))}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Missed visit (Twi)"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Used for</Label>
                <Select
                  value={form.purpose}
                  onValueChange={(v) => setForm({ ...form, purpose: v as Form["purpose"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SMS_PURPOSES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {SMS_PURPOSE_LABELS[p]}
                      </SelectItem>
                    ))}
                    <SelectItem value="none">Manual use only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Language</Label>
                <Select
                  value={form.language}
                  onValueChange={(v) => setForm({ ...form, language: v as Form["language"] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="twi">Twi</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label htmlFor="tpl-message">Message</Label>
              <Textarea
                id="tpl-message"
                rows={5}
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
              />
              <p className={`text-xs mt-1 ${form.message.length > 459 ? "text-rose-600" : "text-gray-500"}`}>
                {form.message.length} / 459 characters (up to 3 SMS)
              </p>
            </div>
            {form.message && (
              <div className="rounded-lg bg-emerald-50 p-3 text-sm text-gray-800">
                <p className="text-xs font-semibold text-emerald-800 mb-1">Preview</p>
                {fillTemplate(form.message, PREVIEW_VARS)}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={save}
              disabled={saving || !form.name.trim() || !form.message.trim() || form.message.length > 459}
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
