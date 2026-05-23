import { Location, SaleDataT } from "@/types";

export function dist3d(a: Location, b: Location): number {
    return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(a.z - b.z, 2));
}

export function clip(min: number, max: number, val: number): number {
    return Math.min(max, Math.max(val, min));
}

export function formatPriceString(price: number, quantity: number): string {
    const isStacked = !(quantity % 64);
    const amount = isStacked ? quantity / 64 : quantity;
    const unit = isStacked ? (amount == 1 ? " stack" : " stacks") : "";
    const priceLabel = price == 1 ? "diamond" : "diamonds";
    return `${amount}${unit} for ${price} ${priceLabel}`;
}

export function formatShopLocation(location: Location) {
    return `at ${location.x} ${location.y} ${location.z}`;
}

export function pricePerStack(sale: SaleDataT) {
    return (64 * sale.price) / sale.quantity;
}

export function niceRound(value: number, places: number = 3) {
    return Math.round(value * Math.pow(10, places)) / Math.pow(10, places);
}

export function formatDistance(blocks: number) {
    const value = Math.ceil(blocks);
    if (value == 1) return "1 block";
    if (value < 1000) return `${value} blocks`;
    return `${niceRound(value / 1000, 1)}K blocks`;
}
