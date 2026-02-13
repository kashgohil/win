import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ChevronsUpDownIcon, GlobeIcon } from "lucide-react";
import { useMemo, useState } from "react";

const TIMEZONES = Intl.supportedValuesOf("timeZone");

/** Common abbreviation → IANA timezone mapping for search */
const TZ_ALIASES: Record<string, string[]> = {
	est: ["America/New_York"],
	edt: ["America/New_York"],
	"eastern time": ["America/New_York"],
	cst: ["America/Chicago"],
	cdt: ["America/Chicago"],
	"central time": ["America/Chicago"],
	mst: ["America/Denver"],
	mdt: ["America/Denver"],
	"mountain time": ["America/Denver"],
	pst: ["America/Los_Angeles"],
	pdt: ["America/Los_Angeles"],
	"pacific time": ["America/Los_Angeles"],
	akst: ["America/Anchorage"],
	akdt: ["America/Anchorage"],
	hst: ["Pacific/Honolulu"],
	gmt: ["Etc/GMT", "Europe/London"],
	bst: ["Europe/London"],
	cet: ["Europe/Paris", "Europe/Berlin"],
	cest: ["Europe/Paris", "Europe/Berlin"],
	eet: ["Europe/Bucharest", "Europe/Athens"],
	eest: ["Europe/Bucharest", "Europe/Athens"],
	ist: ["Asia/Calcutta", "Asia/Kolkata"],
	"indian standard time": ["Asia/Calcutta", "Asia/Kolkata"],
	jst: ["Asia/Tokyo"],
	"japan standard time": ["Asia/Tokyo"],
	kst: ["Asia/Seoul"],
	cst_china: ["Asia/Shanghai"],
	"china standard time": ["Asia/Shanghai"],
	hkt: ["Asia/Hong_Kong"],
	sgt: ["Asia/Singapore"],
	aest: ["Australia/Sydney"],
	aedt: ["Australia/Sydney"],
	acst: ["Australia/Adelaide"],
	awst: ["Australia/Perth"],
	nzst: ["Pacific/Auckland"],
	nzdt: ["Pacific/Auckland"],
	wet: ["Europe/Lisbon"],
	msk: ["Europe/Moscow"],
	utc: ["UTC"],
};

function formatUtcOffset(tz: string): string {
	try {
		const offset = new Intl.DateTimeFormat("en-US", {
			timeZone: tz,
			timeZoneName: "shortOffset",
		})
			.formatToParts(new Date())
			.find((p) => p.type === "timeZoneName")?.value;

		return offset ?? "";
	} catch {
		return "";
	}
}

interface TimezoneOption {
	value: string;
	label: string;
	offset: string;
	region: string;
	searchText: string;
}

/** Build a reverse lookup: IANA id → list of alias keywords */
function buildAliasLookup(): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const [alias, tzIds] of Object.entries(TZ_ALIASES)) {
		for (const id of tzIds) {
			const existing = map.get(id) ?? [];
			existing.push(alias);
			map.set(id, existing);
		}
	}
	return map;
}

function buildTimezoneOptions(): TimezoneOption[] {
	const aliasLookup = buildAliasLookup();

	return TIMEZONES.map((tz) => {
		const offset = formatUtcOffset(tz);
		const parts = tz.split("/");
		const region = parts[0];
		const city = parts.slice(1).join("/").replace(/_/g, " ");
		const label = city || tz;
		const aliases = aliasLookup.get(tz)?.join(" ") ?? "";

		// Combine everything searchable into one string
		const searchText = `${tz} ${label} ${offset} ${aliases}`
			.toLowerCase()
			.replace(/_/g, " ");

		return { value: tz, label, offset, region, searchText };
	});
}

export default function TimezoneCombobox({
	value,
	onChange,
}: {
	value: string;
	onChange: (tz: string) => void;
}) {
	const [open, setOpen] = useState(false);
	const options = useMemo(() => buildTimezoneOptions(), []);

	// Build a lookup from lowercased value → original IANA id
	// (cmdk lowercases values internally)
	const valueLookup = useMemo(() => {
		const map = new Map<string, string>();
		for (const opt of options) {
			map.set(opt.value.toLowerCase(), opt.value);
		}
		return map;
	}, [options]);

	const selected = options.find((o) => o.value === value);

	// Build a searchText lookup keyed by lowercased value for the filter
	const searchIndex = useMemo(() => {
		const map = new Map<string, string>();
		for (const opt of options) {
			map.set(opt.value.toLowerCase(), opt.searchText);
		}
		return map;
	}, [options]);

	const grouped = useMemo(() => {
		const map = new Map<string, TimezoneOption[]>();
		for (const opt of options) {
			const group = map.get(opt.region) ?? [];
			group.push(opt);
			map.set(opt.region, group);
		}
		return map;
	}, [options]);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					aria-expanded={open}
					className={cn(
						"inline-flex items-center gap-2 rounded-sm border border-input bg-transparent px-4 h-12.5 font-mono text-[13px] transition-colors hover:border-grey-2 cursor-pointer max-w-[380px] w-full mx-auto",
						selected ? "text-foreground" : "text-grey-3",
					)}
				>
					<GlobeIcon className="size-3.5 shrink-0 text-grey-3" />
					<span className="flex-1 text-left truncate">
						{selected
							? `${selected.value} (${selected.offset})`
							: "Select timezone…"}
					</span>
					<ChevronsUpDownIcon className="size-3.5 shrink-0 text-grey-3" />
				</button>
			</PopoverTrigger>
			<PopoverContent
				className="w-auto p-0"
				align="start"
				style={{
					width: "var(--radix-popover-trigger-width)",
				}}
			>
				<Command
					filter={(cmdkValue, search) => {
						const searchText = searchIndex.get(cmdkValue) ?? cmdkValue;
						const terms = search.toLowerCase().split(/\s+/);
						return terms.every((t) => searchText.includes(t)) ? 1 : 0;
					}}
				>
					<CommandInput placeholder="Search timezone…" />
					<CommandList>
						<CommandEmpty>No timezone found.</CommandEmpty>
						{[...grouped.entries()].map(([region, tzOptions]) => (
							<CommandGroup key={region} heading={region}>
								{tzOptions.map((opt) => (
									<CommandItem
										key={opt.value}
										value={opt.value}
										onSelect={(v) => {
											onChange(valueLookup.get(v) ?? v);
											setOpen(false);
										}}
										className={cn(
											value === opt.value && "bg-accent text-accent-foreground",
										)}
									>
										<span className="flex-1 truncate">{opt.label}</span>
										<span className="text-grey-3 text-xs font-mono ml-2 shrink-0">
											{opt.offset}
										</span>
									</CommandItem>
								))}
							</CommandGroup>
						))}
					</CommandList>
				</Command>
			</PopoverContent>
		</Popover>
	);
}
