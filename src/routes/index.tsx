"use client";

import { Sidebar } from "../components/sidebar";
import { Location, SaleDataT } from "@/types";
import {
    clip,
    dist3d,
    formatPriceString,
    formatShopLocation,
    pricePerStack,
    niceRound,
    formatDistance,
} from "../utils";
import { Accessor, createEffect, createResource, createSignal, onMount, Setter } from "solid-js";
import { makePersisted } from "@solid-primitives/storage";

function SaleEntry({
    sale,
    setItemId,
    setSeller,
}: {
    sale: SaleDataT & { distance: number };
    setItemId: Setter<string>;
    setSeller: Setter<string>;
}) {
    return (
        <div class="w-full text-xs sm:text-sm md:text-base lg:text-lg xl:text-2xl flex flex-row h-16 glass items-center justify-between">
            <div class="h-full lg:w-1/3 flex flex-row items-center">
                <img
                    alt=""
                    class="cursor-pointer h-12 w-12 mx-2"
                    src={`/api/textures/1.21.8?t=${sale.mcItemId}`}
                    onClick={() => setItemId(sale.mcItemId)}
                />
                <div class="hidden md:block capitalize">{sale.mcItemId.replaceAll("_", " ")}</div>
            </div>
            <div class="h-full w-1/3 grow lg:grow-0 flex flex-row items-center justify-center">
                {formatPriceString(sale.price, sale.quantity)}
            </div>
            <div class="h-full w-1/3 flex flex-row items-center justify-end pr-2 gap-[1ch]">
                <span
                    class="cursor-pointer"
                    onClick={() => {
                        setSeller(sale.shop.seller);
                    }}
                >
                    {sale.shop.seller}
                </span>
                <div>{formatShopLocation(sale.shop.location)}</div>
                <div>({formatDistance(sale.distance)})</div>
            </div>
        </div>
    );
}

export default function Home() {
    // Fetched sales.
    const [sales, setSales] = createSignal<SaleDataT[]>([]);
    // Filtered sales (except for the price).
    const [salesFiltered, setSalesFiltered] = createSignal<(SaleDataT & { distance: number })[]>(
        []
    );
    // Item id from the input.
    const [itemId, setItemId] = createSignal("");
    // Seller from the input.
    const [seller, setSeller] = createSignal("");
    // Max price from the input.
    const [maxPrice, setMaxPrice] = createSignal(0);
    // Min and max price in the filtered sales.
    const [priceRange, setPriceRange] = createSignal({ min: 0, max: 0 });
    // Whether the settings tab is open.
    const [settingsOpen, setSettingsOpen] = createSignal(false);

    // The persistent config from the settings tab.
    const [searchDistance, setSearchDistance] = makePersisted(createSignal(1), {
        name: "searchDistance",
    });
    const [limitByDistance, setLimitByDistance] = makePersisted(createSignal(false), {
        name: "limitByDistance",
    });
    const [sellerBlacklist, setSellerBlacklist] = makePersisted(createSignal(""), {
        name: "sellerBlacklist",
    });
    const [baseLocation, setBaseLocation] = makePersisted(createSignal({ x: 0, y: 0, z: 0 }), {
        name: "baseLocation",
    });

    // Read the settings, fetch the sales.
    onMount(() => {
        fetch("/api/sales")
            .then(res => res.json())
            .then((data: SaleDataT[]) => {
                setSales(data);
            });
    });

    // Filter the sales.
    createEffect(() => {
        let filtered = sales()
            // TODO: free stuff breaks the code.
            .filter(sale => sale.price >= 0)
            // Block sellers from the blacklist.
            .filter(sale => {
                if (!sellerBlacklist()) return true;
                return !sellerBlacklist()
                    .split(";")
                    .map(s => s.trim())
                    .includes(sale.shop.seller);
            })
            // Show only searched sellers.
            .filter(sale => {
                const sellers = seller()
                    .split(";")
                    .map(s => s.trim())
                    .filter(Boolean);
                if (!sellers.length) return true;

                return sellers.some(s => sale.shop.seller.includes(s));
            })
            // Show only searched items.
            .filter(sale => {
                if (!itemId().trim()) return true;

                return itemId()
                    .split(";")
                    .map(s => s.trim())
                    .filter(Boolean)
                    .some(s => {
                        return (
                            sale.mcItemId.includes(s.replaceAll(" ", "_")) ||
                            sale.mcItemId.includes(s)
                        );
                    });
            })
            // Whitespace search.
            .filter(sale => {
                if (itemId().trim()) return true;
                if (!itemId()) return true;
                return sale.mcItemId.includes("_");
            })
            .map(sale => {
                return { ...sale, distance: dist3d(sale.shop.location, baseLocation()) };
            })
            // Limit by search distance when enabled.
            .filter(sale => !limitByDistance() || searchDistance() >= sale.distance)
            .toSorted((a, b) => {
                // Cheapest stuff first.
                const priceDifference = pricePerStack(a) - pricePerStack(b);
                if (priceDifference) return priceDifference;

                // Closer stuff first.
                const distanceDifference = a.distance - b.distance;
                if (distanceDifference) return distanceDifference;

                // Lower quantity first.
                const quantityDifference: number = a.quantity - b.quantity;
                if (quantityDifference) return quantityDifference;

                // Older entries first.
                return a.rid - b.rid;
            });
        setSalesFiltered(filtered);
        const min = filtered.length ? pricePerStack(filtered[0]) : 0;
        const max = filtered.length ? pricePerStack(filtered[filtered.length - 1]) : 0;
        setPriceRange({ min, max });

        setMaxPrice(maxPrice || max);
    });

    return (
        <div class="w-screen h-screen overflow-clip flex flex-row portrait:flex-col">
            <Sidebar
                links={[
                    { title: "SETTINGS", href: () => setSettingsOpen(!settingsOpen) },
                    { title: "CREDITS", href: "/credits" },
                ]}
            >
                {settingsOpen() ? (
                    <Settings
                        limitByDistance={limitByDistance}
                        setLimitByDistance={setLimitByDistance}
                        searchDistance={searchDistance}
                        setSearchDistance={setSearchDistance}
                        sellerBlacklist={sellerBlacklist}
                        setSellerBlacklist={setSellerBlacklist}
                        baseLocation={baseLocation}
                        setBaseLocation={setBaseLocation}
                    />
                ) : (
                    <SearchBar
                        itemId={itemId()}
                        setItemid={setItemId}
                        seller={seller()}
                        setSeller={setSeller}
                        priceRange={priceRange()}
                        maxPrice={maxPrice()}
                        setMaxPrice={setMaxPrice}
                    />
                )}
            </Sidebar>
            <main class="h-full grow overflow-scroll portrait:p-2 p-2 md:p-4 lg:p-8">
                {salesFiltered()
                    .filter(sale => {
                        let current_max = clip(priceRange().min, priceRange().max, maxPrice());
                        return !current_max || pricePerStack(sale) <= current_max;
                    })
                    .map(sale => (
                        <SaleEntry sale={sale} setItemId={setItemId} setSeller={setSeller} />
                    ))}
            </main>
        </div>
    );
}

function SearchBar({
    itemId,
    setItemid,
    seller,
    setSeller,
    priceRange,
    maxPrice,
    setMaxPrice,
}: {
    itemId: string;
    setItemid: Setter<string>;
    seller: string;
    setSeller: Setter<string>;
    priceRange: { min: number; max: number };
    maxPrice: number;
    setMaxPrice: Setter<number>;
}) {
    return (
        <>
            <input
                type="text"
                value={itemId}
                placeholder="search by item id"
                class="search-item focus:outline-hidden p-4 w-full h-16 hover:placeholder:text-neutral-300 placeholder:text-neutral-400 placeholder:text-2xl bg-transparent drop-shadow-xs text-2xl"
                onInput={e => {
                    setItemid(e.currentTarget.value);
                }}
            />
            <input
                type="text"
                value={seller}
                placeholder="search by seller"
                class="search-sell focus:outline-hidden p-4 w-full h-16 hover:placeholder:text-neutral-300 placeholder:text-neutral-400 placeholder:text-2xl bg-transparent drop-shadow-xs text-2xl"
                onInput={e => {
                    setSeller(e.currentTarget.value);
                }}
            />
            <label class="w-full h-24 px-4 flex justify-center items-start text-2xl flex-col text-neutral-400">
                <div>{`max stack price: ${niceRound(clip(priceRange.min, priceRange.max, maxPrice))}`}</div>
                <input
                    type="range"
                    class={`w-full drop-shadow-xs accent-neutral-400 hover:accent-neutral-300 focus:outline-hidden focus:accent-neutral-300 ${priceRange.min == priceRange.max ? "invisible" : ""}`}
                    step="any"
                    value={clip(priceRange.min, priceRange.max, maxPrice)}
                    min={priceRange.min}
                    max={priceRange.max}
                    onInput={e => {
                        setMaxPrice(Number(e.currentTarget.value));
                    }}
                />
            </label>
        </>
    );
}

function Settings({
    limitByDistance,
    setLimitByDistance,
    searchDistance,
    setSearchDistance,
    sellerBlacklist,
    setSellerBlacklist,
    baseLocation,
    setBaseLocation,
}: {
    limitByDistance: Accessor<boolean>;
    setLimitByDistance: Setter<boolean>;
    searchDistance: Accessor<number>;
    setSearchDistance: Setter<number>;
    sellerBlacklist: Accessor<string>;
    setSellerBlacklist: Setter<string>;
    baseLocation: Accessor<Location>;
    setBaseLocation: Setter<Location>;
}) {
    return (
        <>
            <label class="p-4 w-full h-16 drop-shadow-xs text-2xl text-neutral-400">
                limit search distance:
                <input
                    class="ml-[1ch]"
                    type="checkbox"
                    checked={limitByDistance()}
                    onChange={e => {
                        setLimitByDistance(e.currentTarget.checked);
                    }}
                />
            </label>
            <label class="p-4 w-full h-16 drop-shadow-xs text-2xl text-neutral-400">
                search distance:
                <input
                    min="1"
                    class="w-20 bg-transparent ml-[1ch] no-spin"
                    type="number"
                    value={searchDistance()}
                    onInput={e => {
                        setSearchDistance(Number(e.currentTarget.value));
                    }}
                />
            </label>
            <label class="p-4 w-full h-24 drop-shadow-xs text-2xl text-neutral-400">
                sellers blacklist:
                <input
                    class="hover:placeholder:text-neutral-300 placeholder:text-neutral-400 text-neutral-200 bg-transparent w-full focus:outline-hidden"
                    placeholder="Player1;Player2"
                    value={sellerBlacklist()}
                    onInput={e => {
                        setSellerBlacklist(e.currentTarget.value);
                    }}
                />
            </label>
            <label class="p-4 w-full h-24 drop-shadow-xs text-2xl text-neutral-400">
                base location:
                <div class="text-neutral-200 w-full flex *:flex-1 *:w-full">
                    <input
                        class="no-spin"
                        type="number"
                        value={baseLocation().x}
                        onInput={e => {
                            setBaseLocation(bl => {
                                return { ...bl, x: Number(e.currentTarget.value) };
                            });
                        }}
                    ></input>
                    <input
                        class="no-spin"
                        type="number"
                        value={baseLocation().y}
                        onInput={e => {
                            setBaseLocation(bl => {
                                return { ...bl, y: Number(e.currentTarget.value) };
                            });
                        }}
                    ></input>
                    <input
                        class="no-spin"
                        type="number"
                        value={baseLocation().z}
                        onInput={e => {
                            setBaseLocation(bl => {
                                return { ...bl, z: Number(e.currentTarget.value) };
                            });
                        }}
                    ></input>
                </div>
            </label>
        </>
    );
}
