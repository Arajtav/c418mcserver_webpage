"use client";

import { Sidebar } from "@/sidebar";
import { Location, SaleDataT } from "@/types";
import { Dispatch, SetStateAction, useEffect, useState } from "react";
import {
    clip,
    dist3d,
    formatPriceString,
    formatShopLocation,
    pricePerStack,
    niceRound,
    formatDistance,
} from "./utils";
import { useLocalStorage } from "usehooks-ts";

function SaleEntry({
    sale,
    setItemId,
    setSeller,
}: {
    sale: SaleDataT & { distance: number };
    setItemId: Dispatch<SetStateAction<string>>;
    setSeller: Dispatch<SetStateAction<string>>;
}) {
    return (
        <div className="w-full text-xs sm:text-sm md:text-base lg:text-lg xl:text-2xl flex flex-row h-16 glass items-center justify-between">
            <div className="h-full lg:w-1/3 flex flex-row items-center">
                <img
                    alt=""
                    className="cursor-pointer h-12 w-12 mx-2"
                    src={`/api/textures/1.21.8?t=${sale.mcItemId}`}
                    onClick={() => {
                        setItemId(sale.mcItemId);
                    }}
                />
                <div className="hidden md:block capitalize">
                    {sale.mcItemId.replaceAll("_", " ")}
                </div>
            </div>
            <div className="h-full w-1/3 grow lg:grow-0 flex flex-row items-center justify-center">
                {formatPriceString(sale.price, sale.quantity)}
            </div>
            <div className="h-full w-1/3 flex flex-row items-center justify-end pr-2 gap-[1ch]">
                <span
                    className="cursor-pointer"
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
    const [sales, setSales] = useState<SaleDataT[]>([]);
    // Filtered sales (except for the price).
    const [salesFiltered, setSalesFiltered] = useState<(SaleDataT & { distance: number })[]>([]);
    // Item id from the input.
    const [itemId, setItemId] = useState<string>("");
    // Seller from the input.
    const [seller, setSeller] = useState<string>("");
    // Max price from the input.
    const [maxPrice, setMaxPrice] = useState<number>(0);
    /// All distinct prices, always has at least 2 elements.
    const [prices, setPrices] = useState<number[]>([0, 0]);
    // Whether the settings tab is open.
    const [settingsOpen, setSettingsOpen] = useState<boolean>(false);

    // The persistent config from the settings tab.
    const [searchDistance, setSearchDistance] = useLocalStorage("searchDistance", 1);
    const [limitByDistance, setLimitByDistance] = useLocalStorage("limitByDistance", false);
    const [sellerBlacklist, setSellerBlacklist] = useLocalStorage("sellerBlacklist", "");
    const [baseLocation, setBaseLocation] = useLocalStorage("baseLocation", { x: 0, y: 0, z: 0 });

    // Read the settings, fetch the sales.
    useEffect(() => {
        fetch("/api/sales")
            .then(res => res.json())
            .then((data: SaleDataT[]) => {
                setSales(data);
            });
    }, []);

    // Filter the sales.
    useEffect(() => {
        let filtered = sales
            // TODO: free stuff breaks the code.
            .filter(sale => sale.price >= 0)
            // Block sellers from the blacklist.
            .filter(sale => {
                if (!sellerBlacklist) return true;
                return !sellerBlacklist
                    .split(";")
                    .map(s => s.trim())
                    .includes(sale.shop.seller);
            })
            // Show only searched sellers.
            .filter(sale => {
                const sellers = seller
                    .split(";")
                    .map(s => s.trim())
                    .filter(Boolean);
                if (!sellers.length) return true;

                return sellers.some(s => sale.shop.seller.includes(s));
            })
            // Show only searched items.
            .filter(sale => {
                if (!itemId.trim()) return true;

                return itemId
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
                if (itemId.trim()) return true;
                if (!itemId) return true;
                return sale.mcItemId.includes("_");
            })
            .map(sale => {
                return { ...sale, distance: dist3d(sale.shop.location, baseLocation) };
            })
            // Limit by search distance when enabled.
            .filter(sale => !limitByDistance || searchDistance >= sale.distance)
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

        const prices = [];
        let prev = undefined;
        for (const item of filtered) {
            const p = pricePerStack(item);
            if (p != prev) {
                prices.push(p);
                prev = p;
            }
        }

        if (prices.length == 1) {
            prices.push(prices[0]);
        }

        if (prices.length == 0) {
            prices.push(0, 0);
        }

        setPrices(prices);
        setMaxPrice(maxPrice || prices[prices.length - 1]);
    }, [itemId, seller, sales, searchDistance, limitByDistance, sellerBlacklist, baseLocation]);

    return (
        <div className="w-screen h-screen overflow-clip flex flex-row portrait:flex-col">
            <Sidebar
                links={[
                    { title: "SETTINGS", href: () => setSettingsOpen(!settingsOpen) },
                    { title: "CREDITS", href: "/credits" },
                ]}
            >
                {settingsOpen ? (
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
                        itemId={itemId}
                        setItemid={setItemId}
                        seller={seller}
                        setSeller={setSeller}
                        prices={prices}
                        maxPrice={maxPrice}
                        setMaxPrice={setMaxPrice}
                    />
                )}
            </Sidebar>
            <main className="h-full grow overflow-scroll portrait:p-2 p-2 md:p-4 lg:p-8">
                {salesFiltered
                    .filter(sale => {
                        let current_max = clip(prices[0], prices[prices.length - 1], maxPrice);
                        return !current_max || pricePerStack(sale) <= current_max;
                    })
                    .map(sale => (
                        <SaleEntry
                            sale={sale}
                            key={sale.rid}
                            setItemId={setItemId}
                            setSeller={setSeller}
                        />
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
    prices,
    maxPrice,
    setMaxPrice,
}: {
    itemId: string;
    setItemid: Dispatch<SetStateAction<string>>;
    seller: string;
    setSeller: Dispatch<SetStateAction<string>>;
    prices: number[];
    maxPrice: number;
    setMaxPrice: Dispatch<SetStateAction<number>>;
}) {
    const sliderMin = 0;
    const sliderMax = 100;

    const alpha = 0.15;

    const priceToSlider = (price: number) => {
        const min = prices[0];
        const max = prices[prices.length - 1];
        const t = (price - min) / (max - min);
        return sliderMin + Math.pow(t, alpha) * (sliderMax - sliderMin);
    };

    const sliderToPrice = (sliderValue: number) => {
        const min = prices[0];
        const max = prices[prices.length - 1];
        const t = (sliderValue - sliderMin) / (sliderMax - sliderMin);
        return min + Math.pow(t, 1 / alpha) * (max - min);
    };

    return (
        <>
            <input
                type="text"
                value={itemId}
                placeholder="search by item id"
                className="search-item focus:outline-hidden p-4 w-full h-16 hover:placeholder:text-neutral-300 placeholder:text-neutral-400 placeholder:text-2xl bg-transparent drop-shadow-xs text-2xl"
                onInput={e => {
                    setItemid(e.currentTarget.value);
                }}
            />
            <input
                type="text"
                value={seller}
                placeholder="search by seller"
                className="search-sell focus:outline-hidden p-4 w-full h-16 hover:placeholder:text-neutral-300 placeholder:text-neutral-400 placeholder:text-2xl bg-transparent drop-shadow-xs text-2xl"
                onInput={e => {
                    setSeller(e.currentTarget.value);
                }}
            />
            <label className="w-full h-24 px-4 flex justify-center items-start text-2xl flex-col text-neutral-400">
                <div>{`max stack price: ${niceRound(clip(prices[0], prices[prices.length - 1], maxPrice))}`}</div>
                <datalist id="prices">
                    {prices.map(p => (
                        <option key={p} value={priceToSlider(p)} />
                    ))}
                </datalist>
                <input
                    type="range"
                    min={sliderMin}
                    max={sliderMax}
                    className={`w-full drop-shadow-xs accent-neutral-400 hover:accent-neutral-300 focus:outline-hidden focus:accent-neutral-300 ${prices[0] == prices[1] ? "invisible" : ""}`}
                    step="any"
                    list="prices"
                    value={priceToSlider(clip(prices[0], prices[prices.length - 1], maxPrice))}
                    onInput={e => {
                        setMaxPrice(sliderToPrice(Number(e.currentTarget.value)));
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
    limitByDistance: boolean;
    setLimitByDistance: Dispatch<SetStateAction<boolean>>;
    searchDistance: number;
    setSearchDistance: Dispatch<SetStateAction<number>>;
    sellerBlacklist: string;
    setSellerBlacklist: Dispatch<SetStateAction<string>>;
    baseLocation: Location;
    setBaseLocation: Dispatch<SetStateAction<Location>>;
}) {
    return (
        <>
            <label className="p-4 w-full h-16 drop-shadow-xs text-2xl text-neutral-400">
                limit search distance:
                <input
                    className="ml-[1ch]"
                    type="checkbox"
                    checked={limitByDistance}
                    onChange={e => {
                        setLimitByDistance(e.currentTarget.checked);
                    }}
                />
            </label>
            <label className="p-4 w-full h-16 drop-shadow-xs text-2xl text-neutral-400">
                search distance:
                <input
                    min="1"
                    className="w-20 bg-transparent ml-[1ch] no-spin"
                    type="number"
                    value={searchDistance}
                    onInput={e => {
                        setSearchDistance(Number(e.currentTarget.value));
                    }}
                />
            </label>
            <label className="p-4 w-full h-24 drop-shadow-xs text-2xl text-neutral-400">
                sellers blacklist:
                <input
                    className="hover:placeholder:text-neutral-300 placeholder:text-neutral-400 text-neutral-200 bg-transparent w-full focus:outline-hidden"
                    placeholder="Player1;Player2"
                    value={sellerBlacklist}
                    onInput={e => {
                        setSellerBlacklist(e.currentTarget.value);
                    }}
                />
            </label>
            <label className="p-4 w-full h-24 drop-shadow-xs text-2xl text-neutral-400">
                base location:
                <div className="text-neutral-200 w-full flex *:flex-1 *:w-full">
                    <input
                        className="no-spin"
                        type="number"
                        value={baseLocation.x}
                        onInput={e => {
                            setBaseLocation(bl => {
                                return { ...bl, x: Number(e.currentTarget.value) };
                            });
                        }}
                    ></input>
                    <input
                        className="no-spin"
                        type="number"
                        value={baseLocation.y}
                        onInput={e => {
                            setBaseLocation(bl => {
                                return { ...bl, y: Number(e.currentTarget.value) };
                            });
                        }}
                    ></input>
                    <input
                        className="no-spin"
                        type="number"
                        value={baseLocation.z}
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
