import { FormEvent, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import type { Category } from "../types";

type Article = {
  id: string;
  title: string;
  body: string;
  active: boolean;
  category?: Category | null;
};

export function KnowledgeBasePage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    const [articleResult, categoryResult] = await Promise.all([
      apiFetch<{ articles: Article[] }>("/api/knowledge-base"),
      apiFetch<{ categories: Category[] }>("/api/categories")
    ]);
    setArticles(articleResult.articles);
    setCategories(categoryResult.categories);
  }

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const formData = new FormData(event.currentTarget);

    try {
      await apiFetch("/api/knowledge-base", {
        method: "POST",
        body: JSON.stringify({
          title: formData.get("title"),
          body: formData.get("body"),
          categorySlug: formData.get("categorySlug") || undefined,
          active: true
        })
      });
      event.currentTarget.reset();
      await loadData();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Failed to create article.");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
      <form className="rounded-lg border border-slate-200 bg-white p-4" onSubmit={handleCreate}>
        <h2 className="text-lg font-semibold text-slate-950">Knowledge Base Article</h2>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Title
          <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" name="title" />
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Category
          <select className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" name="categorySlug">
            <option value="">None</option>
            {categories.map((category) => (
              <option key={category.id} value={category.slug}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="mt-4 block text-sm font-medium text-slate-700">
          Body
          <textarea
            className="mt-1 min-h-40 w-full rounded-md border border-slate-300 px-3 py-2"
            name="body"
          />
        </label>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <button className="mt-4 rounded-md bg-slate-950 px-4 py-2 text-sm text-white" type="submit">
          Save article
        </button>
      </form>

      <div className="space-y-3">
        {articles.map((article) => (
          <article className="rounded-lg border border-slate-200 bg-white p-4" key={article.id}>
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold text-slate-950">{article.title}</h3>
              <span className="text-xs text-slate-500">{article.category?.name ?? "No category"}</span>
            </div>
            <p className="mt-2 line-clamp-3 text-sm text-slate-600">{article.body}</p>
          </article>
        ))}

        {articles.length === 0 ? (
          <p className="rounded-lg border border-slate-200 bg-white p-6 text-center text-sm text-slate-500">
            No knowledge base articles yet.
          </p>
        ) : null}
      </div>
    </div>
  );
}

