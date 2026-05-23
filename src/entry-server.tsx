// @refresh reload
import { createHandler, StartServer } from "@solidjs/start/server";

// TODO: meta

export default createHandler(() => (
    <StartServer
        document={({ assets, children, scripts }) => (
            <html lang="en">
                <head>
                    <meta charset="utf-8" />
                    <meta name="viewport" content="width=device-width, initial-scale=1" />
                    {assets}
                </head>
                <body
                    id="app"
                    class="text-neutral-200 bg-image-default bg-fixed bg-center bg-cover selection:bg-neutral-200 selection:text-neutral-700"
                >
                    {children}
                </body>
            </html>
        )}
    />
));
