import {
	Bell,
	BellRing,
	Briefcase,
	Calendar,
	Check,
	CheckSquare,
	DollarSign,
	Eye,
	FileText,
	FolderOpen,
	GraduationCap,
	Heart,
	Lightbulb,
	Mail,
	Moon,
	Palette,
	Plane,
	Rocket,
	Share2,
	Users,
	Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
	Bell,
	BellRing,
	Briefcase,
	Calendar,
	Check,
	CheckSquare,
	DollarSign,
	Eye,
	FileText,
	FolderOpen,
	GraduationCap,
	Heart,
	Lightbulb,
	Mail,
	Moon,
	Palette,
	Plane,
	Rocket,
	Share2,
	Users,
	Zap,
};

export function getIcon(name: string): LucideIcon | undefined {
	return iconMap[name];
}

export { Check };
