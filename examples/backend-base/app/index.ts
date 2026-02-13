import { startApp } from "./config";
import exampleComponent from "./exampleComponent";

const { router } = await startApp([exampleComponent]);

export type AppRouter = typeof router;
