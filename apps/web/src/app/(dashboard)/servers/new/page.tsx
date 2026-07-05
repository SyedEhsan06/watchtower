import { ServerForm } from "../server-form";

export default function NewServerPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4 md:p-6">
      <h1 className="text-lg font-semibold">Add Server</h1>
      <ServerForm />
    </div>
  );
}
