import type { ClassificationResult, EmailInput } from "./types";

/**
 * Keyword-based rules engine for high-confidence email classification.
 * Returns a result for obvious cases (newsletters, receipts, promos),
 * or null to signal "send to LLM" for ambiguous emails.
 *
 * Requires multiple signals to avoid false positives.
 */
export function classifyByRules(
	email: EmailInput,
): ClassificationResult | null {
	const subject = email.subject.toLowerCase();
	const from = email.fromAddress.toLowerCase();
	const body = email.bodyPlain.toLowerCase();
	const snippet = email.snippet.toLowerCase();

	const isNoreply =
		from.includes("noreply") ||
		from.includes("no-reply") ||
		from.includes("donotreply");

	// Newsletter: unsubscribe signal + noreply/newsletter sender
	if (isNewsletterEmail(subject, from, body, isNoreply)) {
		return {
			category: "newsletter",
			priorityScore: 10,
			summary: "Newsletter email",
			shouldTriage: false,
			shouldAutoHandle: true,
			autoHandleAction: "archived",
		};
	}

	// Receipt: order/purchase signals + transactional sender patterns
	if (isReceiptEmail(subject, from, snippet, isNoreply)) {
		return {
			category: "receipt",
			priorityScore: 15,
			summary: "Purchase receipt or order confirmation",
			shouldTriage: false,
			shouldAutoHandle: true,
			autoHandleAction: "labeled",
		};
	}

	// Promotional: sale/discount signals + noreply/marketing sender
	if (isPromotionalEmail(subject, from, body, isNoreply)) {
		return {
			category: "promotional",
			priorityScore: 5,
			summary: "Promotional or marketing email",
			shouldTriage: false,
			shouldAutoHandle: true,
			autoHandleAction: "archived",
		};
	}

	// Not confident enough — let the LLM handle it
	return null;
}

function isNewsletterEmail(
	subject: string,
	from: string,
	body: string,
	isNoreply: boolean,
): boolean {
	const hasUnsubscribe =
		body.includes("unsubscribe") || subject.includes("unsubscribe");
	const isNewsletterSender =
		from.includes("newsletter") ||
		from.includes("digest") ||
		from.includes("updates@") ||
		from.includes("news@");

	// Need both: unsubscribe link + noreply/newsletter sender
	if (hasUnsubscribe && (isNoreply || isNewsletterSender)) return true;

	// Strong newsletter sender signals alone
	if (isNewsletterSender && isNoreply) return true;

	return false;
}

function isReceiptEmail(
	subject: string,
	from: string,
	snippet: string,
	isNoreply: boolean,
): boolean {
	const receiptSubjectSignals = [
		"order confirmation",
		"order receipt",
		"your order",
		"purchase confirmation",
		"payment receipt",
		"your receipt",
		"invoice #",
		"shipping confirmation",
		"your shipment",
		"delivery confirmation",
	];

	const hasReceiptSubject = receiptSubjectSignals.some((s) =>
		subject.includes(s),
	);
	const hasOrderNumber =
		/order\s*#?\s*\d/i.test(subject) || /order\s*#?\s*\d/i.test(snippet);

	// Receipt subject + noreply sender = high confidence
	if (hasReceiptSubject && isNoreply) return true;

	// Order number in subject from noreply = high confidence
	if (hasOrderNumber && isNoreply) return true;

	return false;
}

function isPromotionalEmail(
	subject: string,
	from: string,
	body: string,
	isNoreply: boolean,
): boolean {
	const promoSubjectSignals = [
		"% off",
		"sale ends",
		"limited time",
		"flash sale",
		"exclusive offer",
		"save up to",
		"free shipping",
		"coupon",
		"discount code",
		"promo code",
		"deal of the day",
		"black friday",
		"cyber monday",
	];

	const hasPromoSubject = promoSubjectSignals.some((s) => subject.includes(s));
	const isMarketingSender =
		from.includes("marketing") ||
		from.includes("promo") ||
		from.includes("offers@") ||
		from.includes("deals@") ||
		from.includes("sales@");

	// Promo subject + noreply/marketing sender = high confidence
	if (hasPromoSubject && (isNoreply || isMarketingSender)) return true;

	// Marketing sender + unsubscribe in body = promotional
	if (isMarketingSender && body.includes("unsubscribe")) return true;

	return false;
}
