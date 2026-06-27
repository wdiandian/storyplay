import { NewProjectClient } from "./NewProjectClient";

type NewProjectPageProps = {
  params: Promise<{ locale: string }>;
};

export default async function NewProjectPage({ params }: NewProjectPageProps) {
  const { locale } = await params;
  return <NewProjectClient locale={locale} />;
}
