import { A } from "@solidjs/router";
import { children, For, JSX } from "solid-js";

export function Sidebar({
    children,
    links,
}: {
    children?: JSX.Element[] | JSX.Element;
    links: { title: string; href: string | (() => void) }[];
}) {
    return (
        <nav class="h-full portrait:h-fit w-72 portrait:w-full glass flex flex-col justify-between drop-shadow-md">
            <div class="w-full flex items-center justify-center flex-col">{children}</div>
            <div class="w-full flex items-start justify-center flex-col text-2xl">
                <For each={links}>
                    {(ln, i) => {
                        if (typeof ln.href === "string") {
                            return (
                                <A
                                    href={ln.href}
                                    class="p-4 h-16 drop-shadow-xs text-neutral-400 hover:text-neutral-300"
                                >
                                    {ln.title}
                                </A>
                            );
                        }

                        return (
                            <button
                                onClick={ln.href}
                                class="p-4 h-16 drop-shadow-xs text-neutral-400 hover:text-neutral-300 cursor-pointer"
                            >
                                {ln.title}
                            </button>
                        );
                    }}
                </For>
            </div>
        </nav>
    );
}
