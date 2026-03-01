"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { motion } from "motion/react";
import { Tabs as TabsPrimitive } from "radix-ui";
import type * as React from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

const tabsListVariants = cva(
	"relative inline-flex items-center justify-center rounded-lg bg-secondary/30 text-muted-foreground",
	{
		variants: {
			size: {
				sm: "p-1 rounded-md",
				md: "p-1.5 rounded-lg",
				lg: "p-2 rounded-lg",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

const tabsTriggerVariants = cva(
	"relative z-10 inline-flex items-center justify-center whitespace-nowrap font-mono outline-none transition-colors text-grey-3 hover:text-grey-2 data-[state=active]:text-foreground focus-visible:ring-ring/50 focus-visible:ring-[3px] focus-visible:outline-none rounded-sm",
	{
		variants: {
			size: {
				sm: "px-2 py-1 text-[10px]",
				md: "px-2.5 py-2.5 text-[11px]",
				lg: "px-3 py-3 text-xs",
			},
		},
		defaultVariants: {
			size: "md",
		},
	},
);

function Tabs({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn("flex flex-col gap-2", className)}
			{...props}
		/>
	);
}

type IndicatorRect = {
	left: number;
	width: number;
	top: number;
	height: number;
};

function TabsList({
	className,
	children,
	size = "md",
	...props
}: React.ComponentProps<typeof TabsPrimitive.List> &
	VariantProps<typeof tabsListVariants>) {
	const listRef = useRef<HTMLDivElement>(null);
	const [indicator, setIndicator] = useState<IndicatorRect | null>(null);

	const updateIndicator = useCallback(() => {
		const list = listRef.current;
		if (!list) return;
		const active = list.querySelector<HTMLElement>("[data-state=active]");
		if (!active) {
			setIndicator(null);
			return;
		}
		const listRect = list.getBoundingClientRect();
		const activeRect = active.getBoundingClientRect();
		setIndicator({
			left: activeRect.left - listRect.left,
			width: activeRect.width,
			top: activeRect.top - listRect.top,
			height: activeRect.height,
		});
	}, []);

	useEffect(() => {
		updateIndicator();
		const list = listRef.current;
		if (!list) return;
		const observer = new ResizeObserver(updateIndicator);
		observer.observe(list);
		return () => observer.disconnect();
	}, [updateIndicator]);

	// Update indicator when tab selection changes (radix doesn't re-mount list)
	useEffect(() => {
		const list = listRef.current;
		if (!list) return;
		const mo = new MutationObserver(updateIndicator);
		mo.observe(list, {
			attributes: true,
			subtree: true,
			attributeFilter: ["data-state"],
		});
		return () => mo.disconnect();
	}, [updateIndicator]);

	return (
		<TabsPrimitive.List
			ref={listRef}
			data-slot="tabs-list"
			data-size={size}
			className={cn(tabsListVariants({ size }), className)}
			{...props}
		>
			{indicator !== null && (
				<motion.span
					layout
					className="absolute rounded-sm bg-background text-foreground shadow-xs"
					initial={false}
					transition={{
						type: "spring",
						stiffness: 400,
						damping: 30,
					}}
					style={{
						left: indicator.left,
						top: indicator.top,
						width: indicator.width,
						height: indicator.height,
					}}
					aria-hidden
				/>
			)}
			{children}
		</TabsPrimitive.List>
	);
}

function TabsTrigger({
	className,
	size = "md",
	...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger> &
	VariantProps<typeof tabsTriggerVariants>) {
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			data-size={size}
			className={cn(tabsTriggerVariants({ size }), className)}
			{...props}
		/>
	);
}

function TabsContent({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			className={cn(
				"mt-2 outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
				className,
			)}
			{...props}
		/>
	);
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
