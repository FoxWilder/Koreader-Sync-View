import React, { useState, useEffect } from "react";
import {
  useGetSettings,
  useUpdateSettings,
  useTriggerScan,
  useRebuildCache,
  useGetScanStatus,
  getGetSettingsQueryKey,
  getGetScanStatusQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Settings2,
  FolderOpen,
  HardDrive,
  Users,
  Image,
  Database,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Loader2,
  Info,
  ArrowLeft,
  Play,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";

export default function Settings() {
  const queryClient = useQueryClient();
  const { data: settings, isLoading } = useGetSettings();
  const updateSettings = useUpdateSettings();
  const triggerScan = useTriggerScan();
  const rebuildCache = useRebuildCache();
  const { data: scanStatus, refetch: refetchScan } = useGetScanStatus({
    query: {
      refetchInterval: (data) =>
        data?.state?.data?.running ? 800 : false,
      queryKey: getGetScanStatusQueryKey(),
    },
  });

  const [libraryPath, setLibraryPath] = useState("");
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (settings?.library_path) {
      setLibraryPath(settings.library_path);
    }
  }, [settings?.library_path]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaved(false);
    setSaveError("");
    updateSettings.mutate(
      { data: { library_path: libraryPath } },
      {
        onSuccess: () => {
          setSaved(true);
          queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
          setTimeout(() => setSaved(false), 3000);
        },
        onError: (err: Error) => {
          setSaveError(err.message || "Failed to save settings");
        },
      }
    );
  }

  function handleScan() {
    triggerScan.mutate(undefined, {
      onSuccess: () => {
        refetchScan();
      },
    });
  }

  function handleRebuild() {
    rebuildCache.mutate(undefined, {
      onSuccess: () => {
        refetchScan();
        queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() });
      },
    });
  }

  const scanning = scanStatus?.running ?? false;
  const scanDone =
    !scanning &&
    !!scanStatus?.finished_at &&
    !scanStatus?.error &&
    scanStatus.files_processed > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <div className="sticky top-0 z-20 border-b border-border/50 bg-background/90 backdrop-blur-md px-6 py-4 flex items-center gap-4">
        <Link href="/">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-mono text-sm">
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </Link>
        <h1 className="text-sm font-mono text-primary tracking-widest uppercase flex items-center gap-2">
          <Settings2 className="w-4 h-4" />
          Settings
        </h1>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">

        {/* Library Path */}
        <section>
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <FolderOpen className="w-4 h-4" />
            Ebook Library
          </h2>

          <Card className="bg-card/40 border-border/50">
            <CardContent className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground font-mono leading-relaxed">
                Set the root directory of your local ebook collection. The server will
                recursively scan all subdirectories and index every supported ebook file
                (epub, pdf, mobi, azw3, cbz, djvu, fb2, txt) by MD5 hash. This enables
                library search in the dashboard.
              </p>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-mono text-muted-foreground uppercase tracking-wider">
                    Library root path (absolute)
                  </label>
                  <div className="flex gap-3">
                    <Input
                      value={libraryPath}
                      onChange={(e) => setLibraryPath(e.target.value)}
                      placeholder="/home/user/Books  or  C:\Users\user\Books"
                      className="font-mono text-sm bg-background border-border/50 flex-1"
                      disabled={isLoading}
                    />
                    <button
                      type="submit"
                      disabled={updateSettings.isPending || isLoading}
                      className="px-5 py-2 rounded-lg bg-primary text-primary-foreground font-mono text-sm hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
                    >
                      {updateSettings.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        "Save Path"
                      )}
                    </button>
                  </div>
                </div>

                {saved && (
                  <div className="flex items-center gap-2 text-teal-400 font-mono text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Path saved successfully.
                  </div>
                )}
                {saveError && (
                  <div className="flex items-center gap-2 text-destructive font-mono text-sm">
                    <AlertCircle className="w-4 h-4" />
                    {saveError}
                  </div>
                )}
              </form>

              {/* Scan controls */}
              <div className="pt-4 border-t border-border/50 space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-mono text-foreground">Scan Library</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      Walk the library path and add any new books to the existing index.
                    </p>
                  </div>
                  <button
                    onClick={handleScan}
                    disabled={scanning || triggerScan.isPending || rebuildCache.isPending || !libraryPath}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg border border-primary/40 text-primary font-mono text-sm hover:bg-primary/10 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {scanning && !rebuildCache.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Scan Library
                      </>
                    )}
                  </button>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-mono text-foreground">Rebuild MD5 Cache</p>
                    <p className="text-xs font-mono text-muted-foreground mt-0.5">
                      Wipe the existing index and rebuild it from scratch. Use this after
                      renaming files or to fix mismatched hashes.
                    </p>
                  </div>
                  <button
                    onClick={handleRebuild}
                    disabled={scanning || rebuildCache.isPending || !libraryPath}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg border border-destructive/40 text-destructive font-mono text-sm hover:bg-destructive/10 transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    {rebuildCache.isPending || (scanning && rebuildCache.isSuccess) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Rebuilding...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4" />
                        Rebuild Cache
                      </>
                    )}
                  </button>
                </div>

                {/* Scan progress */}
                {(scanning || scanStatus?.finished_at) && (
                  <div className="rounded-lg border border-border/50 bg-background/50 p-4 space-y-3">
                    <div className="flex justify-between items-center text-xs font-mono">
                      <span className="text-muted-foreground uppercase tracking-wider">Scan progress</span>
                      {scanning && (
                        <Badge variant="outline" className="text-primary border-primary/40 font-mono text-[10px]">
                          RUNNING
                        </Badge>
                      )}
                      {scanDone && (
                        <Badge variant="outline" className="text-teal-400 border-teal-400/40 font-mono text-[10px]">
                          COMPLETE
                        </Badge>
                      )}
                      {scanStatus?.error && (
                        <Badge variant="outline" className="text-destructive border-destructive/40 font-mono text-[10px]">
                          ERROR
                        </Badge>
                      )}
                    </div>

                    {/* Progress bar */}
                    {(scanning || scanDone) && (
                      <div>
                        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full transition-all duration-300"
                            style={{
                              width: scanStatus?.files_found
                                ? `${Math.round((scanStatus.files_processed / scanStatus.files_found) * 100)}%`
                                : scanning ? "5%" : "100%",
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1.5">
                          <span>{scanStatus?.files_processed ?? 0} / {scanStatus?.files_found ?? "?"} files</span>
                          {scanStatus?.files_found
                            ? <span>{Math.round(((scanStatus.files_processed ?? 0) / scanStatus.files_found) * 100)}%</span>
                            : null}
                        </div>
                      </div>
                    )}

                    {scanning && scanStatus?.current_file && (
                      <p className="text-[11px] font-mono text-muted-foreground truncate">
                        Processing: {scanStatus.current_file}
                      </p>
                    )}

                    {scanStatus?.error && (
                      <p className="text-xs font-mono text-destructive">{scanStatus.error}</p>
                    )}

                    {scanDone && (
                      <p className="text-xs font-mono text-teal-400">
                        Indexed {scanStatus?.files_processed} books. Library search is now active.
                      </p>
                    )}

                    {settings?.last_scan_iso && (
                      <p className="text-[10px] font-mono text-muted-foreground">
                        Last scan: {settings.last_scan_iso}
                      </p>
                    )}
                  </div>
                )}

                {settings?.book_count !== undefined && settings.book_count > 0 && (
                  <p className="text-xs font-mono text-muted-foreground">
                    Currently indexed: <span className="text-foreground font-bold">{settings.book_count}</span> books
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Progress Sync Data */}
        <section>
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <HardDrive className="w-4 h-4" />
            Progress Sync Data
          </h2>

          <Card className="bg-card/40 border-border/50">
            <CardContent className="p-6 space-y-5">
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex gap-3">
                <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <p className="text-sm font-mono text-muted-foreground leading-relaxed">
                  All reading progress files are stored as plain JSON on disk.
                  Back up the paths below to preserve your reading history. To restore
                  a backup, copy your <code className="text-foreground bg-background/50 px-1 py-0.5 rounded text-xs">auth.json</code> and{" "}
                  <code className="text-foreground bg-background/50 px-1 py-0.5 rounded text-xs">[MD5].json</code> files
                  into the Users directory under the appropriate username folder, then restart the server.
                </p>
              </div>

              <div className="space-y-3">
                <PathRow
                  icon={<HardDrive className="w-4 h-4 text-muted-foreground" />}
                  label="Data directory"
                  description="Root of all KOReader Sync data"
                  value={settings?.data_dir}
                  loading={isLoading}
                />
                <PathRow
                  icon={<Users className="w-4 h-4 text-muted-foreground" />}
                  label="Users directory"
                  description="Per-user subfolders containing auth.json and [MD5].json progress files"
                  value={settings?.users_dir}
                  loading={isLoading}
                  highlight
                />
                <PathRow
                  icon={<Image className="w-4 h-4 text-muted-foreground" />}
                  label="Covers directory"
                  description="Cached book cover images as base64 data URLs ([MD5].txt)"
                  value={settings?.covers_dir}
                  loading={isLoading}
                />
                <PathRow
                  icon={<Database className="w-4 h-4 text-muted-foreground" />}
                  label="Book MD5 cache"
                  description="Maps MD5 hashes to file paths for library search"
                  value={settings?.cache_file}
                  loading={isLoading}
                />
              </div>

              {/* Directory structure visual */}
              <div className="rounded-lg border border-border/50 bg-background/70 p-4">
                <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-3">
                  Directory structure
                </p>
                <pre className="text-[11px] font-mono text-muted-foreground leading-relaxed whitespace-pre overflow-x-auto">{`koreader-data/
├── settings.json          ← app settings
├── book-md5-cache.json    ← library index
├── users/
│   ├── {username}/
│   │   ├── auth.json              ← user record
│   │   └── {MD5}.json             ← reading progress per book
│   └── {another-user}/
│       └── ...
└── covers/
    └── {MD5}.txt          ← cover images (base64)`}</pre>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Supported formats */}
        <section>
          <h2 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" />
            Supported Formats
          </h2>
          <Card className="bg-card/40 border-border/50">
            <CardContent className="p-6">
              <p className="text-sm text-muted-foreground font-mono mb-4">
                The library scanner indexes the following file types:
              </p>
              <div className="flex flex-wrap gap-2">
                {(settings?.supported_extensions || ["epub","pdf","mobi","azw","azw3","cbz","cbr","djvu","fb2","txt"]).map((ext) => (
                  <Badge key={ext} variant="outline" className="font-mono text-xs uppercase tracking-wider border-border/50 text-muted-foreground">
                    .{ext}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

      </div>
    </div>
  );
}

function PathRow({
  icon,
  label,
  description,
  value,
  loading,
  highlight,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  value?: string;
  loading?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-4 space-y-2 ${highlight ? "border-primary/20 bg-primary/5" : "border-border/50 bg-background/30"}`}>
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-xs font-mono text-foreground uppercase tracking-wider">{label}</span>
        {highlight && (
          <Badge variant="outline" className="text-[9px] font-mono text-primary border-primary/30 uppercase tracking-wider ml-auto">
            Back up this folder
          </Badge>
        )}
      </div>
      <p className="text-xs font-mono text-muted-foreground">{description}</p>
      {loading ? (
        <div className="h-5 w-2/3 bg-muted/30 rounded animate-pulse" />
      ) : (
        <code className="text-xs font-mono text-foreground bg-background/60 border border-border/50 rounded px-2 py-1 block break-all">
          {value || "(not set)"}
        </code>
      )}
    </div>
  );
}
