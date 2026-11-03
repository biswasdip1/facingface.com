import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Search, User, FileText, X, ChevronDown, Calendar } from "lucide-react";
import PostCard from "@/components/PostCard";
import { useAuth } from "@/_core/hooks/useAuth";

type Tab = "all" | "posts" | "people";
type DateFilter = "all" | "today" | "week" | "month" | "custom";

export default function SearchPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [query, setQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") ?? "";
  });
  const [submittedQuery, setSubmittedQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("q") ?? "";
  });
  const [activeTab, setActiveTab] = useState<Tab>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [userFilter, setUserFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const trimmed = submittedQuery.trim();

  // Calculate date range based on filter
  const getDateRange = () => {
    const now = new Date();
    let from: Date | null = null;

    switch (dateFilter) {
      case "today":
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case "week":
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case "month":
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case "custom":
        if (fromDate) from = new Date(fromDate);
        break;
      default:
        return { from: null, to: null };
    }

    return {
      from: from?.toISOString() ?? null,
      to: toDate ? new Date(toDate).toISOString() : now.toISOString(),
    };
  };

  const dateRange = getDateRange();

  const { data: userResults, isLoading: usersLoading } = trpc.users.search.useQuery(
    { query: trimmed },
    { enabled: trimmed.length >= 2 }
  );

  const { data: postData, isLoading: postsLoading } = trpc.posts.search.useQuery(
    {
      query: trimmed,
      authorId: userFilter ? parseInt(userFilter) : undefined,
      fromDate: dateRange.from,
      toDate: dateRange.to,
    },
    { enabled: trimmed.length >= 2 }
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length >= 2) {
      setSubmittedQuery(q);
      navigate(`/search?q=${encodeURIComponent(q)}`);
    }
  };

  const isLoading = usersLoading || postsLoading;
  const postResults = postData?.posts ?? [];
  const authors = postData?.authors ?? {};
  const likeCounts = postData?.likeCounts ?? {};
  const hasResults = (userResults?.length ?? 0) > 0 || postResults.length > 0;

  // Filter posts by selected user if needed
  const filteredPostResults = userFilter
    ? postResults.filter((p) => p.authorId === parseInt(userFilter))
    : postResults;

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--its-surface)", color: "var(--its-text-primary)" }}
    >
      {/* Search header */}
      <div
        className="sticky top-16 z-40 border-b px-4 py-3"
        style={{
          backgroundColor: "var(--its-nav-bg)",
          borderColor: "var(--its-border)",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSearch} className="flex items-center gap-2">
            <div
              className="flex items-center gap-2 flex-1 px-3 py-2 border"
              style={{
                borderColor: "var(--its-border)",
                backgroundColor: "var(--its-surface)",
              }}
            >
              <Search size={16} style={{ color: "var(--its-text-muted)", flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search posts, people…"
                autoFocus
                className="flex-1 bg-transparent outline-none text-sm"
                style={{ color: "var(--its-text-primary)", fontFamily: "inherit" }}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setSubmittedQuery("");
                    inputRef.current?.focus();
                  }}
                >
                  <X size={14} style={{ color: "var(--its-text-muted)" }} />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold tracking-widest uppercase border transition-colors"
              style={{
                borderColor: "var(--its-text-primary)",
                color: "var(--its-text-primary)",
                backgroundColor: "transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--its-text-primary)";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--its-surface)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLButtonElement).style.color = "var(--its-text-primary)";
              }}
            >
              Search
            </button>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className="px-3 py-2 text-xs font-bold tracking-widest uppercase border transition-colors flex items-center gap-1"
              style={{
                borderColor: "var(--its-text-primary)",
                color: "var(--its-text-primary)",
                backgroundColor: showFilters ? "var(--its-text-primary)" : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!showFilters) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "var(--its-text-primary)";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--its-surface)";
                }
              }}
              onMouseLeave={(e) => {
                if (!showFilters) {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                  (e.currentTarget as HTMLButtonElement).style.color = "var(--its-text-primary)";
                }
              }}
            >
              <ChevronDown size={14} style={{ transform: showFilters ? "rotate(180deg)" : "rotate(0deg)" }} />
              Filter
            </button>
          </form>

          {/* Advanced Filters */}
          {showFilters && trimmed.length >= 2 && (
            <div
              className="mt-4 p-4 border"
              style={{
                borderColor: "var(--its-border)",
                backgroundColor: "var(--its-surface-alt)",
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Date Filter */}
                <div>
                  <label className="text-xs font-bold tracking-widest uppercase mb-2 block" style={{ color: "var(--its-text-muted)" }}>
                    Date Range
                  </label>
                  <select
                    value={dateFilter}
                    onChange={(e) => {
                      setDateFilter(e.target.value as DateFilter);
                      if (e.target.value !== "custom") {
                        setFromDate("");
                        setToDate("");
                      }
                    }}
                    className="w-full px-3 py-2 text-sm border"
                    style={{
                      borderColor: "var(--its-border)",
                      backgroundColor: "var(--its-surface)",
                      color: "var(--its-text-primary)",
                    }}
                  >
                    <option value="all">All Time</option>
                    <option value="today">Today</option>
                    <option value="week">Last 7 Days</option>
                    <option value="month">Last 30 Days</option>
                    <option value="custom">Custom Range</option>
                  </select>
                </div>

                {/* Custom Date Range */}
                {dateFilter === "custom" && (
                  <>
                    <div>
                      <label className="text-xs font-bold tracking-widest uppercase mb-2 block" style={{ color: "var(--its-text-muted)" }}>
                        From Date
                      </label>
                      <input
                        type="date"
                        value={fromDate}
                        onChange={(e) => setFromDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border"
                        style={{
                          borderColor: "var(--its-border)",
                          backgroundColor: "var(--its-surface)",
                          color: "var(--its-text-primary)",
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold tracking-widest uppercase mb-2 block" style={{ color: "var(--its-text-muted)" }}>
                        To Date
                      </label>
                      <input
                        type="date"
                        value={toDate}
                        onChange={(e) => setToDate(e.target.value)}
                        className="w-full px-3 py-2 text-sm border"
                        style={{
                          borderColor: "var(--its-border)",
                          backgroundColor: "var(--its-surface)",
                          color: "var(--its-text-primary)",
                        }}
                      />
                    </div>
                  </>
                )}

                {/* User Filter */}
                {(activeTab === "all" || activeTab === "posts") && userResults && userResults.length > 0 && (
                  <div>
                    <label className="text-xs font-bold tracking-widest uppercase mb-2 block" style={{ color: "var(--its-text-muted)" }}>
                      Posted by User
                    </label>
                    <select
                      value={userFilter}
                      onChange={(e) => setUserFilter(e.target.value)}
                      className="w-full px-3 py-2 text-sm border"
                      style={{
                        borderColor: "var(--its-border)",
                        backgroundColor: "var(--its-surface)",
                        color: "var(--its-text-primary)",
                      }}
                    >
                      <option value="">All Users</option>
                      {userResults.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Clear Filters Button */}
              <button
                type="button"
                onClick={() => {
                  setDateFilter("all");
                  setUserFilter("");
                  setFromDate("");
                  setToDate("");
                }}
                className="mt-4 px-3 py-2 text-xs font-bold tracking-widest uppercase border"
                style={{
                  borderColor: "var(--its-text-muted)",
                  color: "var(--its-text-muted)",
                  backgroundColor: "transparent",
                }}
              >
                Clear Filters
              </button>
            </div>
          )}

          {/* Tabs */}
          {trimmed.length >= 2 && (
            <div className="flex gap-0 mt-3 border-b" style={{ borderColor: "var(--its-border)" }}>
              {(["all", "posts", "people"] as Tab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className="px-4 py-2 text-xs font-bold tracking-widest uppercase capitalize transition-colors"
                  style={{
                    color: activeTab === tab ? "var(--its-text-primary)" : "var(--its-text-muted)",
                    borderBottom: activeTab === tab ? "2px solid var(--its-text-primary)" : "2px solid transparent",
                    marginBottom: "-1px",
                    backgroundColor: "transparent",
                  }}
                >
                  {tab === "all"
                    ? "All"
                    : tab === "posts"
                    ? `Posts${filteredPostResults.length > 0 ? ` (${filteredPostResults.length})` : ""}`
                    : `People${userResults ? ` (${userResults.length})` : ""}`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        {trimmed.length < 2 ? (
          <div className="text-center py-16">
            <Search size={48} className="mx-auto mb-4" style={{ color: "var(--its-text-muted)" }} />
            <p className="text-sm font-bold tracking-widest uppercase" style={{ color: "var(--its-text-muted)" }}>
              Type at least 2 characters to search
            </p>
          </div>
        ) : isLoading ? (
          <div className="text-center py-16">
            <div className="flex gap-1 justify-center mb-4">
              <span className="its-accent-lg" />
              <span className="its-accent-lg" style={{ opacity: 0.4 }} />
              <span className="its-accent-lg" style={{ opacity: 0.2 }} />
            </div>
            <p className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--its-text-muted)" }}>
              Searching…
            </p>
          </div>
        ) : !hasResults || (activeTab === "posts" && filteredPostResults.length === 0) ? (
          <div className="text-center py-16">
            <p className="text-sm font-bold tracking-widest uppercase" style={{ color: "var(--its-text-muted)" }}>
              No results for &ldquo;{trimmed}&rdquo;
            </p>
            <p className="text-xs mt-2" style={{ color: "var(--its-text-muted)" }}>
              Try different keywords, adjust filters, or check the spelling.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-8">
            {/* People section */}
            {(activeTab === "all" || activeTab === "people") && (userResults?.length ?? 0) > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <User size={14} style={{ color: "var(--its-text-muted)" }} />
                  <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--its-text-muted)" }}>
                    People
                  </h2>
                </div>
                <div className="flex flex-col gap-2">
                  {userResults!.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => navigate(`/profile/${u.id}`)}
                      className="flex items-center gap-3 p-3 border text-left transition-colors w-full"
                      style={{
                        borderColor: "var(--its-border)",
                        backgroundColor: "var(--its-surface-alt)",
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--its-surface-hover)")}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--its-surface-alt)")}
                    >
                      {u.avatar ? (
                        <img
                          src={u.avatar}
                          alt={u.name ?? ""}
                          className="w-10 h-10 object-cover flex-shrink-0"
                          style={{ border: "1px solid var(--its-border)" }}
                        />
                      ) : (
                        <div
                          className="w-10 h-10 flex items-center justify-center flex-shrink-0 font-bold text-sm"
                          style={{
                            backgroundColor: "var(--its-text-primary)",
                            color: "var(--its-surface)",
                          }}
                        >
                          {(u.name ?? "U").charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="font-bold text-sm truncate" style={{ color: "var(--its-text-primary)" }}>
                          {u.name}
                        </div>
                        {u.bio && (
                          <div className="text-xs truncate mt-0.5" style={{ color: "var(--its-text-muted)" }}>
                            {u.bio}
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Posts section */}
            {(activeTab === "all" || activeTab === "posts") && filteredPostResults.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4">
                  <FileText size={14} style={{ color: "var(--its-text-muted)" }} />
                  <h2 className="text-xs font-bold tracking-widest uppercase" style={{ color: "var(--its-text-muted)" }}>
                    Posts
                  </h2>
                </div>
                <div className="flex flex-col gap-4">
                  {filteredPostResults.map((post) => (
                    <PostCard
                      key={post.id}
                      post={post}
                      author={authors[post.authorId]}
                      likeCount={likeCounts[post.id] ?? 0}
                      isLiked={false}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
