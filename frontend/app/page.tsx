"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle, ArrowDownToLine, BriefcaseBusiness, Check, ChevronDown,
  ChevronLeft, ChevronRight, CircleCheck, Clock3, ExternalLink, Globe2,
  MapPin, Moon, MoreHorizontal, Search, SlidersHorizontal, Sun, Upload, X,
} from "lucide-react";
import { toast } from "sonner";

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";

const API = process.env.NEXT_PUBLIC_API_URL;


type Meta = {
  sites: { id: string; label: string; scope: string; countries: string[] | "all" }[];
  countries: string[];
  job_types: string[];
  experience_levels: string[];
  work_modes: string[];
  title_match: string[];
  skill_categories: Record<string, string[]>;
  limits: { max_results_per_site: number; max_tasks_per_job: number; max_top_n: number };
};

type Status = {
  status: "queued" | "running" | "done" | "failed" | "cancelled";
  progress: number;
  tasks_done: number;
  tasks_total: number;
  total_jobs?: number;
  message?: string;
  warnings: string[];
  funnel: { stage: string; jobs: number }[];
  downloads?: Record<string, string>;
};

type Job = Record<string, unknown>;
type SkillOption = { skill: string; category: string };
type ResumeAnalysis = {
  suggested_search: string | null;
  skills: string[];
  years_experience: number | null;
  max_experience_years: number | null;
  summary: string;
};
type RecentSearch = {
  id: string;
  payload: Record<string, unknown>;
  searchedAt: number;
};

const titleCase = (value: string) => value.replace(/\b\w/g, (letter) => letter.toUpperCase());

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API}${path}`, init);
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${response.status})`);
  }
  return response.json();
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="grid size-8 place-items-center rounded-[9px] bg-primary text-primary-foreground shadow-sm">
        <BriefcaseBusiness className="size-4" />
      </div>
      <span className="text-[15px] font-semibold tracking-tight">Job Scraper</span>
    </div>
  );
}

type SearchViewProps = {
  meta: Meta;
  searchTerm: string; setSearchTerm: (value: string) => void;
  locations: string[]; setLocations: (value: string[]) => void;
  locationInput: string; setLocationInput: (value: string) => void;
  cities: string[]; setCities: (value: string[]) => void;
  cityInput: string; setCityInput: (value: string) => void;
  sites: string[]; setSites: (value: string[]) => void;
  workMode: string; setWorkMode: (value: string) => void;
  hoursOld: string; setHoursOld: (value: string) => void;
  jobTypes: string[]; setJobTypes: (value: string[]) => void;
  experience: string[]; setExperience: (value: string[]) => void;
  extraTerms: string; setExtraTerms: (value: string) => void;
  mustAny: string; setMustAny: (value: string) => void;
  mustAll: string; setMustAll: (value: string) => void;
  exclude: string; setExclude: (value: string) => void;
  boost: string; setBoost: (value: string) => void;
  companiesInclude: string; setCompaniesInclude: (value: string) => void;
  companiesExclude: string; setCompaniesExclude: (value: string) => void;
  titleMatch: string; setTitleMatch: (value: string) => void;
  easyApply: boolean; setEasyApply: (value: boolean) => void;
  fetchFull: boolean; setFetchFull: (value: boolean) => void;
  maxExperience: string; setMaxExperience: (value: string) => void;
  minSalary: string; setMinSalary: (value: string) => void;
  salaryCurrency: string; setSalaryCurrency: (value: string) => void;
  requireSalary: boolean; setRequireSalary: (value: boolean) => void;
  resultsPerSite: string; setResultsPerSite: (value: string) => void;
  topN: string; setTopN: (value: string) => void;
  skills: string[]; setSkills: (value: string[]) => void;
  skillSearch: string; setSkillSearch: (value: string) => void;
  skillOptions: SkillOption[]; activeFilterCount: number;
  recentSearches: RecentSearch[]; onRunRecent: (search: RecentSearch) => void; onClearRecent: () => void;
  resumeFileName: string; resumeBusy: boolean; resumeAnalysis: ResumeAnalysis | null;
  onResumeUpload: (file: File) => void;
  submit: () => void; submitting: boolean;
};

function SearchView(props: SearchViewProps) {
  const p = props;
  const sortedLocations = useMemo(() => {
    const term = p.locationInput.trim().toLowerCase();
    const locations = p.meta.countries.filter((country) => {
      const normalized = country.toLowerCase();
      return !term || normalized.includes(term);
    });
    if (!term) return locations;
    return locations.sort((left, right) => {
      const a = left.toLowerCase();
      const b = right.toLowerCase();
      const aExact = a === term;
      const bExact = b === term;
      if (aExact !== bExact) return aExact ? -1 : 1;
      const aStarts = a.startsWith(term);
      const bStarts = b.startsWith(term);
      if (aStarts !== bStarts) return aStarts ? -1 : 1;
      return a.localeCompare(b);
    });
  }, [p.locationInput, p.meta.countries]);
  const addLocation = (value: string) => {
    const clean = value.trim();
    if (clean && !p.locations.includes(clean)) p.setLocations([...p.locations.filter((x) => x !== "worldwide"), clean]);
  };
  const addCity = () => {
    if (p.cityInput.trim() && !p.cities.includes(p.cityInput.trim())) p.setCities([...p.cities, p.cityInput.trim()]);
    p.setCityInput("");
  };
  const toggleList = (values: string[], value: string, setter: (value: string[]) => void) => {
    setter(values.includes(value) ? values.filter((item) => item !== value) : [...values, value]);
  };
  const toggleLocation = (country: string) => {
    const selected = p.locations.filter((location) => location !== "worldwide");
    const next = selected.includes(country)
      ? selected.filter((location) => location !== country)
      : [...selected, country];
    p.setLocations(next.length ? next : ["worldwide"]);
  };
  return (
    <main className="mx-auto max-w-[1100px] px-4 py-10 sm:px-6 sm:py-14">
      <div className="mx-auto max-w-[820px]">
        <div className="mb-8">
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Job discovery</p>
          <h1 className="text-[26px] font-semibold tracking-tight sm:text-[30px]">Find your next opportunity</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Search across selected platforms, then rank every role against your profile.</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-2 shadow-[0_1px_2px_rgba(0,0,0,.04)]">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-search-input
                value={p.searchTerm}
                onChange={(event) => p.setSearchTerm(event.target.value)}
                onKeyDown={(event) => event.key === "Enter" && p.submit()}
                placeholder="Job title or role"
                className="h-12 border-0 bg-transparent pl-10 text-[15px] shadow-none focus-visible:ring-0"
              />
            </div>
            <Popover>
              <PopoverTrigger render={
                <Button variant="outline" className="h-12 min-w-44 justify-start gap-2 px-3 font-normal sm:w-auto">
                  <MapPin className="size-4 text-muted-foreground" />
                  <span className="truncate">{p.locations[0] === "worldwide" ? "Worldwide" : p.locations.join(", ")}</span>
                </Button>
              } />
              <PopoverContent className="w-72 p-2">
                <div className="mb-2 flex gap-2">
                  <Input value={p.locationInput} onChange={(event) => p.setLocationInput(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && (addLocation(p.locationInput), p.setLocationInput(""))}
                    placeholder="Country or region" />
                  <Button size="icon" onClick={() => (addLocation(p.locationInput), p.setLocationInput(""))}><Check className="size-4" /></Button>
                </div>
                <div className="max-h-52 space-y-1 overflow-auto">
                  {sortedLocations.length === 0 && (
                    <p className="px-2 py-3 text-xs text-muted-foreground">No matching locations</p>
                  )}
                  {sortedLocations.map((country) => (
                    <label key={country} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent">
                      <Checkbox checked={p.locations.includes(country)} onCheckedChange={() => toggleLocation(country)} />
                      <span className="capitalize">{country}</span>
                    </label>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
            <Button className="h-12 px-5" onClick={p.submit} disabled={p.submitting}>
              {p.submitting ? "Starting..." : "Search Jobs"}
              {!p.submitting && <ChevronRight className="size-4" />}
            </Button>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {p.locations.filter((location) => location !== "worldwide").map((location) => (
            <Chip key={location} onRemove={() => p.setLocations(p.locations.filter((item) => item !== location))}>{titleCase(location)}</Chip>
          ))}
          {p.locations[0] === "worldwide" && <Chip>Worldwide</Chip>}
          {p.cities.map((city) => (
            <Chip key={city} onRemove={() => p.setCities(p.cities.filter((item) => item !== city))}>{city}</Chip>
          ))}
          <Popover>
            <PopoverTrigger render={<button type="button" className="h-7 rounded-md px-1 text-xs text-muted-foreground hover:text-foreground">+ City</button>} />
            <PopoverContent className="w-72 p-2">
              <div className="flex gap-2">
                <Input value={p.cityInput} onChange={(event) => p.setCityInput(event.target.value)}
                  onKeyDown={(event) => event.key === "Enter" && addCity()} placeholder="City, State or Country" />
                <Button size="icon" onClick={addCity}><Check className="size-4" /></Button>
              </div>
            </PopoverContent>
          </Popover>
          <div className="ml-auto">
            <Select value={p.hoursOld} onValueChange={(value) => value && p.setHoursOld(value)}>
              <SelectTrigger className="h-7 w-32 border-0 bg-muted/50 px-2 text-xs shadow-none">
                <Clock3 className="mr-1.5 size-3.5" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">Past 24 hours</SelectItem>
                <SelectItem value="72">Past 3 days</SelectItem>
                <SelectItem value="168">Past week</SelectItem>
                <SelectItem value="720">Past month</SelectItem>
                <SelectItem value="any">Any time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {p.recentSearches.length > 0 && (
          <div className="mt-6 flex items-center gap-2 overflow-x-auto pb-1">
            <div className="mr-1 flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
              <Clock3 className="size-3.5" />
              <span>Recent</span>
            </div>
            {p.recentSearches.map((search) => (
              <button
                key={search.id}
                type="button"
                onClick={() => p.onRunRecent(search)}
                className="shrink-0 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent"
              >
                {String(search.payload.search_term || "Untitled search")}
              </button>
            ))}
            <button type="button" onClick={p.onClearRecent} className="shrink-0 px-1 text-xs text-muted-foreground hover:text-foreground">
              Clear
            </button>
          </div>
        )}

        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_280px]">
          <Card className="border-border/80 py-0">
            <CardContent className="p-0">
              <div className="flex h-10 items-center justify-between border-b px-4">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="size-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">Advanced settings</span>
                  {p.activeFilterCount > 0 && <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">{p.activeFilterCount}</Badge>}
                </div>
                {p.activeFilterCount > 0 && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                    onClick={() => {
                      p.setLocations(["worldwide"]); p.setCities([]); p.setSites(p.meta.sites.map((site) => site.id));
                      p.setWorkMode("any"); p.setHoursOld("72"); p.setJobTypes([]); p.setExperience([]);
                      p.setExtraTerms(""); p.setMustAny(""); p.setMustAll(""); p.setExclude(""); p.setBoost("");
                      p.setCompaniesInclude(""); p.setCompaniesExclude(""); p.setTitleMatch("off");
                      p.setEasyApply(false); p.setFetchFull(true); p.setMaxExperience(""); p.setMinSalary("");
                      p.setSalaryCurrency(""); p.setRequireSalary(false); p.setResultsPerSite("30"); p.setTopN("100");
                      p.setSkills([]);
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
              <Accordion className="px-4">
                <AccordionItem value="platforms">
                  <AccordionTrigger className="text-sm">Platforms
                    {p.sites.length !== p.meta.sites.length && <Badge variant="secondary" className="ml-2">{p.sites.length}</Badge>}
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="grid grid-cols-2 gap-2 pb-1">
                      {p.meta.sites.map((site) => (
                        <label key={site.id} className="flex items-center gap-2 rounded-md px-1 py-1.5 text-sm">
                          <Checkbox checked={p.sites.includes(site.id)} onCheckedChange={() => toggleList(p.sites, site.id, p.setSites)} />
                          {site.label}
                        </label>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="job">
                  <AccordionTrigger className="text-sm">Role & requirements</AccordionTrigger>
                  <AccordionContent className="space-y-4">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Work mode</label>
                        <ToggleGroup value={[p.workMode]} onValueChange={(value) => value[0] && p.setWorkMode(value[0])} className="justify-start">
                          {p.meta.work_modes.map((mode) => <ToggleGroupItem key={mode} value={mode} className="h-8 px-3 text-xs">{titleCase(mode)}</ToggleGroupItem>)}
                        </ToggleGroup>
                      </div>
                      <div>
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Title match</label>
                        <Select value={p.titleMatch} onValueChange={(value) => value && p.setTitleMatch(value)}>
                          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                          <SelectContent>{p.meta.title_match.map((value) => <SelectItem key={value} value={value}>{titleCase(value)}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Job type</label>
                      <div className="flex flex-wrap gap-2">
                        {p.meta.job_types.map((type) => (
                          <Badge key={type} variant={p.jobTypes.includes(type) ? "default" : "outline"}
                            className="cursor-pointer font-normal" onClick={() => toggleList(p.jobTypes, type, p.setJobTypes)}>
                            {titleCase(type)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div><label className="mb-1.5 block text-xs text-muted-foreground">Experience</label>
                        <MultiPopover label="Any level" items={p.meta.experience_levels} values={p.experience} onChange={p.setExperience} />
                      </div>
                      <div><label className="mb-1.5 block text-xs text-muted-foreground">Max years</label>
                        <Input type="number" min="0" max="40" value={p.maxExperience} onChange={(event) => p.setMaxExperience(event.target.value)} placeholder="No limit" className="h-9" />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={p.easyApply} onCheckedChange={(checked) => p.setEasyApply(Boolean(checked))} />Easy Apply only</label>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="keywords">
                  <AccordionTrigger className="text-sm">Keywords & companies</AccordionTrigger>
                  <AccordionContent className="grid gap-3 pb-2 sm:grid-cols-2">
                    <div><label className="mb-1.5 block text-xs text-muted-foreground">Include any</label><Input value={p.mustAny} onChange={(e) => p.setMustAny(e.target.value)} placeholder="React, Python" /></div>
                    <div><label className="mb-1.5 block text-xs text-muted-foreground">Include all</label><Input value={p.mustAll} onChange={(e) => p.setMustAll(e.target.value)} placeholder="SQL, Tableau" /></div>
                    <div><label className="mb-1.5 block text-xs text-muted-foreground">Exclude keywords</label><Input value={p.exclude} onChange={(e) => p.setExclude(e.target.value)} placeholder="Sales, marketing" /></div>
                    <div><label className="mb-1.5 block text-xs text-muted-foreground">Boost keywords</label><Input value={p.boost} onChange={(e) => p.setBoost(e.target.value)} placeholder="Fintech, SaaS" /></div>
                    <div><label className="mb-1.5 block text-xs text-muted-foreground">Include companies</label><Input value={p.companiesInclude} onChange={(e) => p.setCompaniesInclude(e.target.value)} /></div>
                    <div><label className="mb-1.5 block text-xs text-muted-foreground">Exclude companies</label><Input value={p.companiesExclude} onChange={(e) => p.setCompaniesExclude(e.target.value)} /></div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="output">
                  <AccordionTrigger className="text-sm">Salary & output</AccordionTrigger>
                  <AccordionContent className="grid gap-3 pb-2 sm:grid-cols-2">
                    <div><label className="mb-1.5 block text-xs text-muted-foreground">Minimum salary</label><Input type="number" value={p.minSalary} onChange={(e) => p.setMinSalary(e.target.value)} placeholder="Annual amount" /></div>
                    <div><label className="mb-1.5 block text-xs text-muted-foreground">Currency</label><Input value={p.salaryCurrency} onChange={(e) => p.setSalaryCurrency(e.target.value.toUpperCase())} maxLength={3} placeholder="USD" /></div>
                    <div><label className="mb-1.5 block text-xs text-muted-foreground">Results per platform</label><Input type="number" min="1" max={p.meta.limits.max_results_per_site} value={p.resultsPerSite} onChange={(e) => p.setResultsPerSite(e.target.value)} /></div>
                    <div><label className="mb-1.5 block text-xs text-muted-foreground">Top results</label><Input type="number" min="1" max={p.meta.limits.max_top_n} value={p.topN} onChange={(e) => p.setTopN(e.target.value)} /></div>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={p.requireSalary} onCheckedChange={(checked) => p.setRequireSalary(Boolean(checked))} />Salary required</label>
                    <label className="flex items-center gap-2 text-sm"><Checkbox checked={p.fetchFull} onCheckedChange={(checked) => p.setFetchFull(Boolean(checked))} />Fetch full descriptions</label>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card className="h-fit border-border/80 py-0">
            <CardContent className="p-4">
              <div className="mb-3 flex items-center justify-between">
                <div><h2 className="text-sm font-semibold">Your skills</h2><p className="mt-0.5 text-xs text-muted-foreground">Used for match ranking</p></div>
                {p.skills.length > 0 && <Badge variant="secondary">{p.skills.length}</Badge>}
              </div>
              <label className="mb-2 flex h-9 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 px-3 text-xs font-medium transition-colors hover:border-primary/40 hover:bg-muted/50">
                <Upload className={`size-3.5 ${p.resumeBusy ? "animate-pulse" : ""}`} />
                {p.resumeBusy ? "Analyzing resume..." : "Use my resume"}
                <input
                  type="file"
                  accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={p.resumeBusy}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) p.onResumeUpload(file);
                    event.currentTarget.value = "";
                  }}
                />
              </label>
              {p.resumeAnalysis && (
                <div className="mb-2 rounded-lg border border-border/70 bg-muted/25 p-2.5">
                  <p className="truncate text-[10px] text-muted-foreground">{p.resumeFileName}</p>
                  {p.resumeAnalysis.suggested_search && (
                    <p className="mt-1 text-xs font-medium">{p.resumeAnalysis.suggested_search}</p>
                  )}
                  {p.resumeAnalysis.years_experience !== null && (
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {p.resumeAnalysis.years_experience} years experience detected
                    </p>
                  )}
                </div>
              )}
              <Popover>
                <PopoverTrigger render={
                  <Button variant="outline" className="h-9 w-full justify-start gap-2 font-normal"><Search className="size-3.5 text-muted-foreground" />Add skills</Button>
                } />
                <PopoverContent className="w-64 p-0">
                  <Command>
                    <CommandInput placeholder="Search skills..." value={p.skillSearch} onValueChange={p.setSkillSearch} />
                    <CommandList>
                      <CommandEmpty>No skills found.</CommandEmpty>
                      <CommandGroup>
                        {p.skillOptions.map((option) => (
                          <CommandItem
                            key={`${option.category}-${option.skill}`}
                            onSelect={() => p.setSkills(p.skills.includes(option.skill) ? p.skills : [...p.skills, option.skill])}
                          >
                            <Check className={`mr-2 size-3.5 ${p.skills.includes(option.skill) ? "opacity-100" : "opacity-0"}`} />
                            <span>{option.skill}</span>
                            <span className="ml-auto text-[10px] text-muted-foreground">{option.category}</span>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {p.skills.length === 0 ? (
                  <p className="text-xs leading-5 text-muted-foreground">Skills improve relevance and reveal gaps.</p>
                ) : p.skills.map((skill) => (
                  <Chip key={skill} onRemove={() => p.setSkills(p.skills.filter((item) => item !== skill))}>{skill}</Chip>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function ShellHeader({ onNewSearch }: { onNewSearch: () => void }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const preferred = localStorage.theme === "dark" ||
      (!localStorage.theme && window.matchMedia("(prefers-color-scheme: dark)").matches);
    setDark(preferred);
    document.documentElement.classList.toggle("dark", preferred);
  }, []);
  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.theme = next ? "dark" : "light";
  };
  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border/80 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-full max-w-[1100px] items-center justify-between px-4 sm:px-6">
        <Logo />
        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="sm" className="hidden text-muted-foreground sm:inline-flex" onClick={onNewSearch}>
            New search
          </Button>
          <Tooltip>
            <TooltipTrigger render={
              <Button variant="ghost" size="icon" className="size-8" onClick={toggleTheme} aria-label="Toggle theme">
                {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </Button>
            } />
            <TooltipContent>Toggle theme</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </header>
  );
}

function MultiPopover({
  label, items, values, onChange,
}: { label: string; items: string[]; values: string[]; onChange: (values: string[]) => void }) {
  const toggle = (value: string) => onChange(values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]);
  return (
    <Popover>
      <PopoverTrigger render={
        <Button variant="outline" className="h-9 justify-between gap-2 px-3 font-normal">
          <span className="truncate">{values.length ? `${values.length} selected` : label}</span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      } />
      <PopoverContent align="start" className="w-64 p-2">
        <div className="max-h-64 space-y-1 overflow-auto">
          {items.map((item) => (
            <label key={item} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-accent">
              <Checkbox checked={values.includes(item)} onCheckedChange={() => toggle(item)} />
              <span className="capitalize">{titleCase(item)}</span>
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function Chip({ children, onRemove }: { children: ReactNode; onRemove?: () => void }) {
  return (
    <span className="inline-flex h-7 items-center gap-1 rounded-md border border-border bg-muted/40 px-2 text-xs font-medium">
      {children}
      {onRemove && (
        <button type="button" onClick={onRemove} className="ml-0.5 text-muted-foreground hover:text-foreground" aria-label="Remove filter">
          <X className="size-3" />
        </button>
      )}
    </span>
  );
}

export default function Home() {
  const queryClient = useQueryClient();
  const [view, setView] = useState<"search" | "progress" | "results">("search");
  const [jobId, setJobId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [locations, setLocations] = useState<string[]>(["worldwide"]);
  const [locationInput, setLocationInput] = useState("");
  const [cities, setCities] = useState<string[]>([]);
  const [cityInput, setCityInput] = useState("");
  const [sites, setSites] = useState<string[]>([]);
  const [workMode, setWorkMode] = useState("any");
  const [hoursOld, setHoursOld] = useState("72");
  const [jobTypes, setJobTypes] = useState<string[]>([]);
  const [experience, setExperience] = useState<string[]>([]);
  const [extraTerms, setExtraTerms] = useState("");
  const [mustAny, setMustAny] = useState("");
  const [mustAll, setMustAll] = useState("");
  const [exclude, setExclude] = useState("");
  const [boost, setBoost] = useState("");
  const [companiesInclude, setCompaniesInclude] = useState("");
  const [companiesExclude, setCompaniesExclude] = useState("");
  const [titleMatch, setTitleMatch] = useState("off");
  const [easyApply, setEasyApply] = useState(false);
  const [fetchFull, setFetchFull] = useState(true);
  const [maxExperience, setMaxExperience] = useState("");
  const [minSalary, setMinSalary] = useState("");
  const [salaryCurrency, setSalaryCurrency] = useState("");
  const [requireSalary, setRequireSalary] = useState(false);
  const [resultsPerSite, setResultsPerSite] = useState("30");
  const [topN, setTopN] = useState("100");
  const [skills, setSkills] = useState<string[]>([]);
  const [skillSearch, setSkillSearch] = useState("");
  const [skillOptions, setSkillOptions] = useState<SkillOption[]>([]);
  const [resumeFileName, setResumeFileName] = useState("");
  const [resumeBusy, setResumeBusy] = useState(false);
  const [resumeAnalysis, setResumeAnalysis] = useState<ResumeAnalysis | null>(null);
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      return JSON.parse(localStorage.getItem("job-scraper-recent") || "[]") as RecentSearch[];
    } catch {
      return [];
    }
  });

  const metaQuery = useQuery({ queryKey: ["meta"], queryFn: () => api<Meta>("/api/meta") });
  const meta = metaQuery.data;

  useEffect(() => {
    if (meta && sites.length === 0) setSites(meta.sites.map((site) => site.id));
  }, [meta, sites.length]);

  useEffect(() => {
    const saved = localStorage.getItem("job-scraper-job");
    if (saved) setJobId(saved);
  }, []);

  useEffect(() => {
    const savedDraft = localStorage.getItem("job-scraper-draft");
    if (!savedDraft) return;
    try {
      const draft = JSON.parse(savedDraft) as Record<string, unknown>;
      if (typeof draft.search_term === "string") setSearchTerm(draft.search_term);
      if (Array.isArray(draft.extra_search_terms)) setExtraTerms(draft.extra_search_terms.join(", "));
      if (Array.isArray(draft.countries)) setLocations(draft.countries as string[]);
      if (Array.isArray(draft.cities)) setCities(draft.cities as string[]);
      if (Array.isArray(draft.sites)) setSites(draft.sites as string[]);
      if (typeof draft.work_mode === "string") setWorkMode(draft.work_mode);
      if (draft.hours_old === null) setHoursOld("any");
      else if (typeof draft.hours_old === "number") setHoursOld(String(draft.hours_old));
      if (Array.isArray(draft.job_types)) setJobTypes(draft.job_types as string[]);
      if (Array.isArray(draft.experience_levels)) setExperience(draft.experience_levels as string[]);
      if (Array.isArray(draft.my_skills)) setSkills(draft.my_skills as string[]);
      if (typeof draft.easy_apply === "boolean") setEasyApply(draft.easy_apply);
      if (typeof draft.fetch_full_description === "boolean") setFetchFull(draft.fetch_full_description);
      if (typeof draft.require_salary === "boolean") setRequireSalary(draft.require_salary);
      if (typeof draft.max_experience_years === "number") setMaxExperience(String(draft.max_experience_years));
      if (typeof draft.min_salary_annual === "number") setMinSalary(String(draft.min_salary_annual));
      if (typeof draft.salary_currency === "string") setSalaryCurrency(draft.salary_currency);
      if (typeof draft.results_per_site === "number") setResultsPerSite(String(draft.results_per_site));
      if (typeof draft.top_n === "number") setTopN(String(draft.top_n));
      if (Array.isArray(draft.must_include_any)) setMustAny(draft.must_include_any.join(", "));
      if (Array.isArray(draft.must_include_all)) setMustAll(draft.must_include_all.join(", "));
      if (Array.isArray(draft.exclude_keywords)) setExclude(draft.exclude_keywords.join(", "));
      if (Array.isArray(draft.boost_keywords)) setBoost(draft.boost_keywords.join(", "));
      if (Array.isArray(draft.company_include)) setCompaniesInclude(draft.company_include.join(", "));
      if (Array.isArray(draft.company_exclude)) setCompaniesExclude(draft.company_exclude.join(", "));
      if (typeof draft.title_match === "string") setTitleMatch(draft.title_match);
    } catch {
      localStorage.removeItem("job-scraper-draft");
    }
  }, []);

  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key !== "/" || target.matches("input, textarea, [contenteditable='true']")) return;
      event.preventDefault();
      document.querySelector<HTMLInputElement>("[data-search-input]")?.focus();
    };
    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, []);

  const statusQuery = useQuery({
    queryKey: ["status", jobId],
    queryFn: () => api<Status>(`/api/scrape/${jobId}`),
    enabled: Boolean(jobId) && (view === "progress" || view === "results"),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && ["queued", "running"].includes(status) ? 1500 : false;
    },
  });

  useEffect(() => {
    if (statusQuery.data?.status === "done") setView("results");
  }, [statusQuery.data?.status]);

  useEffect(() => {
    const timeout = window.setTimeout(async () => {
      try {
        const options = await api<SkillOption[]>(`/api/skills?q=${encodeURIComponent(skillSearch)}&limit=20`);
        setSkillOptions(options);
      } catch {
        setSkillOptions([]);
      }
    }, 150);
    return () => window.clearTimeout(timeout);
  }, [skillSearch]);

  const analyzeResume = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Resume is too large", { description: "Choose a file smaller than 5 MB." });
      return;
    }
    setResumeBusy(true);
    setResumeFileName(file.name);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${API}/api/resume/analyze`, { method: "POST", body: form });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.detail || "Could not analyze resume.");
      const analysis = body as ResumeAnalysis;
      setResumeAnalysis(analysis);
      if (analysis.suggested_search) setSearchTerm(analysis.suggested_search);
      if (analysis.skills.length) setSkills((current) => Array.from(new Set([...current, ...analysis.skills])));
      if (analysis.max_experience_years !== null)setMaxExperience(String(analysis.max_experience_years));
      toast.success("Resume analyzed", {
        description: `${analysis.skills.length} skills and a suggested role were added. Review before searching.`,
      });
    } catch (error) {
      toast.error("Could not analyze resume", { description: error instanceof Error ? error.message : "Please try another file." });
    } finally {
      setResumeBusy(false);
    }
  };

  const split = (value: string) => value.split(",").map((item) => item.trim()).filter(Boolean);
  const activeFilterCount = [
    locations.length > 1 || locations[0] !== "worldwide",
    cities.length > 0, sites.length > 0 && meta ? sites.length !== meta.sites.length : false,
    workMode !== "any", hoursOld !== "72", jobTypes.length > 0, experience.length > 0,
    extraTerms, mustAny, mustAll, exclude, boost, companiesInclude, companiesExclude,
    easyApply, !fetchFull, maxExperience, minSalary, requireSalary, skills.length > 0,
  ].filter(Boolean).length;

  const scrape = useMutation({
    mutationFn: (body: object) => api<{ job_id: string; tasks_planned: number; warnings: string[] }>("/api/scrape", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
    onSuccess: (data) => {
      setJobId(data.job_id);
      localStorage.setItem("job-scraper-job", data.job_id);
      setView("progress");
      toast.success("Search started", { description: `${data.tasks_planned} requests planned` });
    },
    onError: (error) => toast.error("Could not start search", { description: error.message }),
  });

  const submit = () => {
    if (searchTerm.trim().length < 2) {
      toast.error("Enter a search term", { description: "Use at least 2 characters." });
      return;
    }
    const payload = {
      search_term: searchTerm.trim(),
      extra_search_terms: split(extraTerms),
      countries: locations,
      cities,
      sites,
      hours_old: hoursOld === "any" ? null : Number(hoursOld),
      work_mode: workMode,
      job_types: jobTypes,
      easy_apply: easyApply,
      experience_levels: experience,
      max_experience_years: maxExperience ? Number(maxExperience) : null,
      min_salary_annual: minSalary ? Number(minSalary) : null,
      salary_currency: salaryCurrency || null,
      require_salary: requireSalary,
      must_include_any: split(mustAny),
      must_include_all: split(mustAll),
      exclude_keywords: split(exclude),
      boost_keywords: split(boost),
      company_include: split(companiesInclude),
      company_exclude: split(companiesExclude),
      title_match: titleMatch,
      my_skills: skills,
      results_per_site: Number(resultsPerSite),
      top_n: Number(topN),
      fetch_full_description: fetchFull,
    };
    localStorage.setItem("job-scraper-draft", JSON.stringify(payload));
    const nextRecent: RecentSearch[] = [
      { id: `${Date.now()}`, payload, searchedAt: Date.now() },
      ...recentSearches.filter((item) => item.payload.search_term !== payload.search_term),
    ].slice(0, 5);
    setRecentSearches(nextRecent);
    localStorage.setItem("job-scraper-recent", JSON.stringify(nextRecent));
    scrape.mutate(payload);
  };

  const runRecent = (search: RecentSearch) => {
    const payload = search.payload;
    if (typeof payload.search_term === "string") setSearchTerm(payload.search_term);
    if (Array.isArray(payload.countries)) setLocations(payload.countries as string[]);
    if (Array.isArray(payload.cities)) setCities(payload.cities as string[]);
    if (Array.isArray(payload.sites)) setSites(payload.sites as string[]);
    if (typeof payload.work_mode === "string") setWorkMode(payload.work_mode);
    if (payload.hours_old === null) setHoursOld("any");
    else if (typeof payload.hours_old === "number") setHoursOld(String(payload.hours_old));
    if (Array.isArray(payload.job_types)) setJobTypes(payload.job_types as string[]);
    if (Array.isArray(payload.experience_levels)) setExperience(payload.experience_levels as string[]);
    if (Array.isArray(payload.my_skills)) setSkills(payload.my_skills as string[]);
    localStorage.setItem("job-scraper-draft", JSON.stringify(payload));
    scrape.mutate(payload);
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem("job-scraper-recent");
  };

  const cancel = useMutation({
    mutationFn: () => api(`/api/scrape/${jobId}/cancel`, { method: "POST" }),
    onSuccess: () => {
      toast.message("Cancellation requested");
      queryClient.invalidateQueries({ queryKey: ["status", jobId] });
    },
  });

  const newSearch = () => {
    setView("search");
    setJobId(null);
    localStorage.removeItem("job-scraper-job");
  };

  if (metaQuery.isLoading) {
    return <PageLoading />;
  }
  if (metaQuery.isError) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <Card className="max-w-md border-destructive/30">
          <CardContent className="p-6">
            <div className="mb-3 flex size-9 items-center justify-center rounded-lg bg-destructive/10 text-destructive"><AlertTriangle className="size-5" /></div>
            <h2 className="font-semibold">Unable to reach the API</h2>
            <p className="mt-1 text-sm text-muted-foreground">Make sure the FastAPI server is running at {API}, then refresh.</p>
            <Button className="mt-4" onClick={() => metaQuery.refetch()} variant="outline">Try again</Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ShellHeader onNewSearch={newSearch} />
      {view === "search" && (
        <SearchView
          meta={meta!} searchTerm={searchTerm} setSearchTerm={setSearchTerm}
          locations={locations} setLocations={setLocations} locationInput={locationInput}
          setLocationInput={setLocationInput} cities={cities} setCities={setCities}
          cityInput={cityInput} setCityInput={setCityInput} sites={sites} setSites={setSites}
          workMode={workMode} setWorkMode={setWorkMode} hoursOld={hoursOld} setHoursOld={setHoursOld}
          jobTypes={jobTypes} setJobTypes={setJobTypes} experience={experience} setExperience={setExperience}
          extraTerms={extraTerms} setExtraTerms={setExtraTerms} mustAny={mustAny} setMustAny={setMustAny}
          mustAll={mustAll} setMustAll={setMustAll} exclude={exclude} setExclude={setExclude}
          boost={boost} setBoost={setBoost} companiesInclude={companiesInclude}
          setCompaniesInclude={setCompaniesInclude} companiesExclude={companiesExclude}
          setCompaniesExclude={setCompaniesExclude} titleMatch={titleMatch} setTitleMatch={setTitleMatch}
          easyApply={easyApply} setEasyApply={setEasyApply} fetchFull={fetchFull} setFetchFull={setFetchFull}
          maxExperience={maxExperience} setMaxExperience={setMaxExperience} minSalary={minSalary}
          setMinSalary={setMinSalary} salaryCurrency={salaryCurrency} setSalaryCurrency={setSalaryCurrency}
          requireSalary={requireSalary} setRequireSalary={setRequireSalary}
          resultsPerSite={resultsPerSite} setResultsPerSite={setResultsPerSite} topN={topN} setTopN={setTopN}
          skills={skills} setSkills={setSkills} skillSearch={skillSearch} setSkillSearch={setSkillSearch}
          skillOptions={skillOptions} activeFilterCount={activeFilterCount} submit={submit}
          recentSearches={recentSearches} onRunRecent={runRecent} onClearRecent={clearRecent}
          resumeFileName={resumeFileName} resumeBusy={resumeBusy} resumeAnalysis={resumeAnalysis}
          onResumeUpload={analyzeResume}
          submitting={scrape.isPending}
        />
      )}
      {view === "progress" && statusQuery.data && (
        <ProgressView status={statusQuery.data} onCancel={() => cancel.mutate()} cancelling={cancel.isPending} onNewSearch={newSearch} />
      )}
      {view === "progress" && !statusQuery.data && (
        <ProgressLoading />
      )}
      {view === "results" && jobId && statusQuery.data && (
        <ResultsView jobId={jobId} status={statusQuery.data} meta={meta!} onNewSearch={newSearch} />
      )}
    </div>
  );
}

function PageLoading() {
  return (
    <div className="min-h-screen">
      <header className="h-14 border-b"><div className="mx-auto max-w-[1100px] px-6 py-3"><Skeleton className="h-8 w-36" /></div></header>
      <main className="mx-auto max-w-[820px] px-6 py-14">
        <Skeleton className="mb-3 h-4 w-28" /><Skeleton className="mb-8 h-9 w-72" />
        <Skeleton className="h-16 w-full rounded-xl" /><div className="mt-8 grid gap-4 md:grid-cols-[1fr_280px]">
          <Skeleton className="h-64 rounded-xl" /><Skeleton className="h-40 rounded-xl" />
        </div>
      </main>
    </div>
  );
}

function ProgressLoading() {
  return (
    <main className="mx-auto max-w-[820px] px-4 py-16 sm:px-6">
      <Skeleton className="mb-3 h-4 w-32" /><Skeleton className="mb-8 h-8 w-64" />
      <Card className="py-0"><CardContent className="p-6"><Skeleton className="h-3 w-full" /><Skeleton className="mt-6 h-20 w-full" /></CardContent></Card>
    </main>
  );
}

function ProgressView({ status, onCancel, cancelling, onNewSearch }: {
  status: Status; onCancel: () => void; cancelling: boolean; onNewSearch: () => void;
}) {
  const percentage = Math.round(status.progress * 100);
  const terminal = ["done", "failed", "cancelled"].includes(status.status);
  const label = status.status === "queued" ? "Waiting for a worker" :
    status.status === "running" ? "Scanning job platforms" :
    status.status === "done" ? "Search complete" :
    status.status === "failed" ? "Search failed" : "Search cancelled";
  return (
    <main className="mx-auto max-w-[820px] px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-7">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.16em] text-primary">Search run</p>
        <h1 className="text-[26px] font-semibold tracking-tight">Building your job list</h1>
      </div>
      <Card className="py-0">
        <CardContent className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="mb-1 flex items-center gap-2 text-sm font-semibold">
                {status.status === "done" ? <CircleCheck className="size-4 text-emerald-500" /> : <Globe2 className="size-4 text-primary" />}
                {label}
              </div>
              <p className="text-xs text-muted-foreground">
                {status.tasks_done} of {status.tasks_total} requests completed
              </p>
            </div>
            <span className="font-mono text-2xl font-semibold tabular-nums">{percentage}%</span>
          </div>
          <Progress value={percentage} className="mt-5 h-2" />

          {status.status === "failed" && (
            <div className="mt-5 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              {status.message || "An unexpected error occurred."}
            </div>
          )}
          {status.status === "cancelled" && (
            <div className="mt-5 rounded-lg border border-border bg-muted/40 p-3 text-sm text-muted-foreground">
              {status.message || "This search was cancelled."}
            </div>
          )}
          {status.status === "done" && status.total_jobs === 0 && (
            <div className="mt-5 rounded-lg border border-border p-4">
              <p className="text-sm font-medium">No jobs matched the selected filters</p>
              <p className="mt-1 text-xs text-muted-foreground">Try broadening keywords, location, or salary filters.</p>
            </div>
          )}

          {status.funnel.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {status.funnel.map((item) => (
                <div key={item.stage} className="rounded-lg border border-border/70 p-3">
                  <p className="text-lg font-semibold tabular-nums">{item.jobs}</p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{item.stage}</p>
                </div>
              ))}
            </div>
          )}

          {status.warnings.length > 0 && (
            <Accordion className="mt-5 border-t">
              <AccordionItem value="warnings" className="border-0">
                <AccordionTrigger className="text-sm text-muted-foreground"><span className="flex items-center gap-2"><AlertTriangle className="size-4" />{status.warnings.length} platform warning(s)</span></AccordionTrigger>
                <AccordionContent>
                  <div className="max-h-36 space-y-1 overflow-auto text-xs text-muted-foreground">
                    {status.warnings.map((warning, index) => <p key={index}>{warning}</p>)}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          <div className="mt-6 flex justify-end gap-2">
            {(status.status === "failed" || status.status === "cancelled" || (status.status === "done" && status.total_jobs === 0)) && (
              <Button variant="outline" onClick={onNewSearch}>New search</Button>
            )}
            {!terminal && (
              <AlertDialog>
                <AlertDialogTrigger render={<Button variant="outline" disabled={cancelling}>Cancel search</Button>} />
                <AlertDialogContent>
                  <AlertDialogHeader><AlertDialogTitle>Cancel this search?</AlertDialogTitle>
                    <AlertDialogDescription>This stops remaining requests. Completed results may be discarded.</AlertDialogDescription></AlertDialogHeader>
                  <AlertDialogFooter><AlertDialogCancel>Keep searching</AlertDialogCancel><AlertDialogAction onClick={onCancel}>Cancel search</AlertDialogAction></AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

function ResultsView({ jobId, status, meta, onNewSearch }: {
  jobId: string; status: Status; meta: Meta; onNewSearch: () => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [query, setQuery] = useState("");
  const [platform, setPlatform] = useState("all");
  const [sort, setSort] = useState("relevance");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const resultsQuery = useQuery({
    queryKey: ["results", jobId, page, pageSize],
    queryFn: () => api<{ total: number; page: number; page_size: number; items: Job[] }>(`/api/results/${jobId}?page=${page}&page_size=${pageSize}`),
  });

  const jobs = resultsQuery.data?.items || [];
  const filtered = useMemo(() => {
    let items = jobs.filter((job) => {
      const haystack = `${job["Job Title"] || ""} ${job.Company || ""} ${job.Location || ""}`.toLowerCase();
      return (!query || haystack.includes(query.toLowerCase())) &&
        (platform === "all" || job.Platform === platform);
    });
    items = [...items].sort((a, b) => {
      if (sort === "match") return Number(b["Skill Match %"] || 0) - Number(a["Skill Match %"] || 0);
      if (sort === "company") return String(a.Company || "").localeCompare(String(b.Company || ""));
      if (sort === "recent") return String(b["Date Posted"] || "").localeCompare(String(a["Date Posted"] || ""));
      return Number(b.Relevance || 0) - Number(a.Relevance || 0);
    });
    return items;
  }, [jobs, query, platform, sort]);

  const totalPages = Math.max(1, Math.ceil((resultsQuery.data?.total || 0) / pageSize));
  const download = (format: string) => {
    window.open(`${API}/api/download/${jobId}?format=${format}`, "_blank", "noopener,noreferrer");
  };
  const platformOptions = useMemo(() => Array.from(new Set(jobs.map((job) => String(job.Platform || "")).filter(Boolean))), [jobs]);

  return (
    <main className="mx-auto max-w-[1100px] px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">{status.tasks_done} requests completed</p>
          <h1 className="text-[24px] font-semibold tracking-tight">
            {resultsQuery.isLoading ? "Loading results" : `${resultsQuery.data?.total || 0} jobs found`}
          </h1>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger render={
            <Button variant="outline" className="h-9"><ArrowDownToLine className="size-4" />Download<ChevronDown className="ml-1 size-3.5" /></Button>
          } />
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => download("xlsx")}>Excel (.xlsx)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => download("csv")}>CSV (.csv)</DropdownMenuItem>
            <DropdownMenuItem onClick={() => download("json")}>JSON (.json)</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {status.warnings.length > 0 && (
        <Accordion className="mb-4 rounded-lg border px-3">
          <AccordionItem value="warnings" className="border-0">
            <AccordionTrigger className="py-3 text-xs text-muted-foreground"><span className="flex items-center gap-2"><AlertTriangle className="size-3.5" />{status.warnings.length} platform warning(s)</span></AccordionTrigger>
            <AccordionContent className="pb-3 text-xs text-muted-foreground">{status.warnings.slice(0, 8).join(" · ")}</AccordionContent>
          </AccordionItem>
        </Accordion>
      )}

      {(query || platform !== "all" || sort !== "relevance") && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {query && <Chip onRemove={() => setQuery("")}>Search: {query}</Chip>}
          {platform !== "all" && <Chip onRemove={() => setPlatform("all")}>{platform}</Chip>}
          {sort !== "relevance" && (
            <Chip onRemove={() => setSort("relevance")}>Sort: {sort === "match" ? "Skill match" : sort === "recent" ? "Most recent" : "Company"}</Chip>
          )}
        </div>
      )}

      <div className="mb-3 flex flex-col gap-2 rounded-lg border border-border bg-card p-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter this page" className="h-8 pl-8 shadow-none" />
        </div>
        <Select value={platform} onValueChange={(value) => value && setPlatform(value)}>
          <SelectTrigger className="h-8 w-full sm:w-40"><SelectValue placeholder="Platform" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All platforms</SelectItem>{platformOptions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => value && setSort(value)}>
          <SelectTrigger className="h-8 w-full sm:w-40"><SelectValue placeholder="Sort" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="relevance">Relevance</SelectItem><SelectItem value="match">Skill match</SelectItem>
            <SelectItem value="recent">Most recent</SelectItem><SelectItem value="company">Company</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {resultsQuery.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 8 }).map((_, index) => <Skeleton key={index} className="h-14 w-full" />)}</div>
      ) : resultsQuery.isError ? (
        <Card className="py-0"><CardContent className="p-8 text-center"><p className="text-sm font-medium">Could not load results</p><Button className="mt-3" variant="outline" onClick={() => resultsQuery.refetch()}>Try again</Button></CardContent></Card>
      ) : filtered.length === 0 ? (
        <Card className="py-0"><CardContent className="p-10 text-center"><Search className="mx-auto mb-3 size-5 text-muted-foreground" /><p className="text-sm font-medium">No jobs on this page match</p><p className="mt-1 text-xs text-muted-foreground">Clear or adjust the toolbar filters.</p></CardContent></Card>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-lg border border-border bg-card md:block">
            <table className="w-full table-fixed text-left">
              <thead className="border-b border-border bg-muted/70 text-[10px] uppercase tracking-[0.08em] text-muted-foreground">
                <tr className="h-11">
                  <th className="w-[34%] px-4 font-semibold">Role</th>
                  <th className="w-[18%] px-3 font-semibold">Company</th>
                  <th className="w-[17%] px-3 font-semibold">Location</th>
                  <th className="w-[12%] px-3 font-semibold">Salary</th>
                  <th className="w-[11%] px-3 font-semibold">Match</th>
                  <th className="w-[8%] px-3 text-right font-semibold">Posted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((job, index) => {
                  const match = Number(job["Skill Match %"] || 0);
                  return (
                    <tr key={index} onClick={() => setSelectedJob(job)} className="h-[64px] cursor-pointer bg-card transition-colors hover:bg-muted/45">
                      <td className="px-4 py-2.5">
                        <Tooltip>
                          <TooltipTrigger render={
                            <div className="max-w-full truncate text-sm font-semibold">{String(job["Job Title"] || "Untitled role")}</div>
                          } />
                          <TooltipContent>{String(job["Job Title"] || "Untitled role")}</TooltipContent>
                        </Tooltip>
                        <div className="mt-1 flex items-center gap-1.5">
                          <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">{String(job.Platform || "Unknown")}</Badge>
                          {job.Remote === "Yes" && <span className="text-[10px] text-muted-foreground">Remote</span>}
                        </div>
                      </td>
                      <td className="truncate px-3 text-xs font-medium">{String(job.Company || "—")}</td>
                      <td className="truncate px-3 text-xs text-muted-foreground">{String(job.Location || "—")}</td>
                      <td className="truncate px-3 text-xs tabular-nums">{String(job.Salary || "—")}</td>
                      <td className="px-3"><div className="flex items-center gap-2"><Progress value={match} className="h-1.5 flex-1" /><span className="w-7 text-right text-xs tabular-nums">{match}%</span></div></td>
                      <td className="px-3 text-right text-xs tabular-nums text-muted-foreground">{String(job["Date Posted"] || "—")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-2 md:hidden">
            {filtered.map((job, index) => {
              const match = Number(job["Skill Match %"] || 0);
              return (
                <button key={index} onClick={() => setSelectedJob(job)} className="w-full rounded-lg border border-border bg-card p-4 text-left transition-colors active:bg-accent">
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{String(job["Job Title"] || "Untitled role")}</p><p className="mt-1 text-xs text-muted-foreground">{String(job.Company || "—")} · {String(job.Location || "—")}</p></div><Badge variant="secondary" className="shrink-0 text-[10px]">{String(job.Platform || "Unknown")}</Badge></div>
                  <div className="mt-3 flex items-center gap-3"><div className="flex-1"><Progress value={match} className="h-1.5" /></div><span className="text-xs font-medium">{match}% match</span></div>
                  {Boolean(job.Salary) && <p className="mt-2 text-xs">{String(job.Salary)}</p>}
                </button>
              );
            })}
          </div>
        </>
      )}

      {resultsQuery.data && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-1">
            <Button variant="outline" size="icon" className="size-8" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft className="size-4" /></Button>
            <Button variant="outline" size="icon" className="size-8" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      )}

      <Sheet open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
        <SheetContent className="w-full sm:max-w-[520px]">
          {selectedJob && <JobDetails job={selectedJob} />}
        </SheetContent>
      </Sheet>
    </main>
  );
}

function JobDetails({ job }: { job: Job }) {
  const trackingKey = `job-scraper-tracking:${String(job["Job URL Link"] || `${job.Company}-${job["Job Title"]}`)}`;
  const [status, setStatus] = useState(String(job["Application Status"] || "Not Applied"));
  const [notes, setNotes] = useState(String(job["Follow-up Notes"] || ""));
  useEffect(() => {
    try {
      const saved = localStorage.getItem(trackingKey);
      if (saved) {
        const tracking = JSON.parse(saved) as { status?: string; notes?: string };
        if (tracking.status) setStatus(tracking.status);
        if (typeof tracking.notes === "string") setNotes(tracking.notes);
      }
    } catch {
      localStorage.removeItem(trackingKey);
    }
  }, [trackingKey]);
  const matched = String(job["Matched Skills"] || "").split(",").map((item) => item.trim()).filter(Boolean);
  const gaps = String(job["Skill Gaps"] || "").split(",").map((item) => item.trim()).filter(Boolean);
  const match = Number(job["Skill Match %"] || 0);
  return (
    <>
      <SheetHeader className="border-b px-6 pr-12">
        <div className="mb-2 flex items-center gap-2"><Badge variant="secondary">{String(job.Platform || "Unknown")}</Badge>{job.Remote === "Yes" && <Badge variant="outline">Remote</Badge>}</div>
        <SheetTitle className="text-xl">{String(job["Job Title"] || "Untitled role")}</SheetTitle>
        <SheetDescription className="flex items-center gap-2"><span>{String(job.Company || "—")}</span><span>·</span><span>{String(job.Location || "—")}</span></SheetDescription>
      </SheetHeader>
      <div className="h-[calc(100%-96px)] overflow-y-auto px-6 py-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border p-3"><p className="text-[11px] text-muted-foreground">Salary</p><p className="mt-1 text-sm font-medium">{String(job.Salary || "Not listed")}</p></div>
          <div className="rounded-lg border p-3"><p className="text-[11px] text-muted-foreground">Posted</p><p className="mt-1 text-sm font-medium">{String(job["Date Posted"] || "Unknown")}</p></div>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between"><p className="text-sm font-semibold">Skill match</p><p className="text-xs font-medium">{match}%</p></div>
          <Progress value={match} className="h-2" />
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div><p className="mb-2 text-xs font-medium text-muted-foreground">Matched</p><div className="flex flex-wrap gap-1.5">{matched.length ? matched.map((skill) => <Badge key={skill} variant="secondary" className="font-normal">{skill}</Badge>) : <span className="text-xs text-muted-foreground">No matches identified</span>}</div></div>
          <div><p className="mb-2 text-xs font-medium text-muted-foreground">Gaps</p><div className="flex flex-wrap gap-1.5">{gaps.length ? gaps.map((skill) => <Badge key={skill} variant="outline" className="font-normal">{skill}</Badge>) : <span className="text-xs text-muted-foreground">No gaps identified</span>}</div></div>
        </div>
        <div className="mt-6 border-t pt-5">
          <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Application status</label>
          <Select value={status} onValueChange={(value) => value && setStatus(value)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="Not Applied">Not Applied</SelectItem><SelectItem value="Applied">Applied</SelectItem><SelectItem value="Interview">Interview</SelectItem><SelectItem value="Offer">Offer</SelectItem><SelectItem value="Rejected">Rejected</SelectItem></SelectContent>
          </Select>
          <label className="mb-1.5 mt-4 block text-xs font-medium text-muted-foreground">Notes</label>
          <Textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Follow-up timing, recruiter, or next step..." className="min-h-24 resize-none" />
          <Button className="mt-3 w-full" onClick={() => {
            localStorage.setItem(trackingKey, JSON.stringify({ status, notes }));
            toast.success("Tracking details saved");
          }}>Save tracking details</Button>
        </div>
        {Boolean(job["Job URL Link"]) && (
          <Button variant="outline" className="mt-4 w-full" onClick={() => window.open(String(job["Job URL Link"]), "_blank", "noopener,noreferrer")}>
            Open original listing<ExternalLink className="size-4" />
          </Button>
        )}
      </div>
    </>
  );
}
