import React from "react";
import { tr } from "./i18n.js";

export default function Template({ v }) {
  return (
    <>
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          background: "var(--bg)",
          color: "var(--text)",
        }}
      >
        <header
          style={{
            borderBottom: "1px solid var(--line)",
            background: "var(--bg)",
          }}
        >
          <div
            style={{
              maxWidth: "1160px",
              margin: "0 auto",
              padding: "14px 24px",
              display: "flex",
              alignItems: "center",
              gap: "20px",
              flexWrap: "wrap",
            }}
          >
            <a
              href="#/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                color: "var(--text)",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: "22px",
                  height: "22px",
                  borderRadius: "6px",
                  background: "var(--accent)",
                  display: "grid",
                  placeItems: "center",
                  color: "var(--accent-ink)",
                  fontFamily: "'Geist Mono',monospace",
                  fontSize: "13px",
                  fontWeight: "600",
                }}
              >
                {tr("layout.logo_mark")}
              </span>
              <span style={{ fontWeight: "600", fontSize: "15px" }}>
                {tr("layout.brand")}
              </span>
              <span
                style={{
                  fontFamily: "'Geist Mono',monospace",
                  fontSize: "13px",
                  color: "var(--muted)",
                }}
              >
                {tr("layout.catalog")}
              </span>
            </a>
            <nav
              style={{
                display: "flex",
                gap: "4px",
                flexWrap: "wrap",
                flex: "1",
              }}
            >
              {(v.nav || []).map((n, __i) => (
                <React.Fragment key={__i}>
                  <a
                    href={n.href}
                    style={{
                      padding: "6px 10px",
                      borderRadius: "6px",
                      fontSize: "14px",
                      textDecoration: "none",
                      color: n.fg,
                      background: n.bg,
                      display: "flex",
                      gap: "6px",
                      alignItems: "center",
                    }}
                  >
                    {n.label}
                    {n.hasCount ? (
                      <>
                        <span
                          style={{
                            fontFamily: "'Geist Mono',monospace",
                            fontSize: "11px",
                            background: "var(--accent)",
                            color: "var(--accent-ink)",
                            borderRadius: "9px",
                            padding: "0 6px",
                          }}
                        >
                          {n.count}
                        </span>
                      </>
                    ) : null}
                  </a>
                </React.Fragment>
              ))}
            </nav>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <a
                href="https://github.com/georgsby/dev-digest-ai-marketplace"
                target="_blank"
                rel="noopener"
                style={{ fontSize: "14px", color: "var(--muted)" }}
              >
                {tr("layout.github")}
              </a>
              <button
                onClick={v.toggleTheme}
                aria-label={tr("layout.toggle_theme")}
                style={{
                  height: "32px",
                  padding: "0 10px",
                  borderRadius: "6px",
                  border: "1px solid var(--line)",
                  background: "var(--panel)",
                  cursor: "pointer",
                  fontSize: "13px",
                }}
              >
                {v.themeLabel}
              </button>
            </div>
          </div>
        </header>
        <main style={{ flex: "1" }}>
          {v.isHome ? (
            <>
              <section
                style={{
                  maxWidth: "820px",
                  margin: "0 auto",
                  padding: "64px 24px 28px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "18px",
                  alignItems: "center",
                  textAlign: "center",
                }}
              >
                <h1
                  style={{
                    margin: "0",
                    fontSize: "clamp(28px,4.4vw,42px)",
                    lineHeight: "1.1",
                    letterSpacing: "-0.02em",
                    fontWeight: "600",
                    textWrap: "balance",
                  }}
                >
                  {tr("home.find_plugins_skills_and_agents")}
                </h1>
                <p
                  style={{
                    margin: "0",
                    color: "var(--muted)",
                    fontSize: "16px",
                  }}
                >
                  {v.heroSub}
                </p>
                <div
                  style={{
                    width: "100%",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                    marginTop: "10px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      height: "58px",
                      padding: "0 10px 0 18px",
                      background: "var(--panel)",
                      border: "1px solid var(--line)",
                      borderRadius: "12px",
                    }}
                    className="st0"
                  >
                    <span
                      style={{
                        fontFamily: "'Geist Mono',monospace",
                        color: "var(--muted)",
                        fontSize: "16px",
                      }}
                    >
                      {"⌕"}
                    </span>
                    <input
                      ref={v.searchRef}
                      value={v.q}
                      onChange={v.onQuery}
                      type="search"
                      aria-label={tr("home.search_the_catalog")}
                      placeholder={tr("home.describe_what_you_need_in")}
                      style={{
                        flex: "1",
                        minWidth: "0",
                        height: "100%",
                        border: "0",
                        outline: "0",
                        background: "transparent",
                        fontSize: "17px",
                      }}
                    />
                    <kbd
                      style={{
                        fontFamily: "'Geist Mono',monospace",
                        fontSize: "12px",
                        color: "var(--muted)",
                        border: "1px solid var(--line)",
                        borderRadius: "5px",
                        padding: "2px 7px",
                      }}
                    >
                      {"/"}
                    </kbd>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      flexWrap: "wrap",
                      justifyContent: "space-between",
                      minHeight: "30px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                        alignItems: "center",
                      }}
                    >
                      {v.hasIntent ? (
                        <>
                          <button
                            onClick={v.dismissIntent}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              height: "28px",
                              padding: "0 10px",
                              borderRadius: "14px",
                              border: "1px solid var(--accent)",
                              background: "var(--hl)",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                          >
                            {v.intentLabel}{" "}
                            <span
                              aria-hidden="true"
                              style={{ color: "var(--muted)" }}
                            >
                              {"×"}
                            </span>
                          </button>
                        </>
                      ) : null}
                      {(v.activeChips || []).map((ch, __i) => (
                        <React.Fragment key={__i}>
                          <button
                            onClick={ch.remove}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "6px",
                              height: "28px",
                              padding: "0 10px",
                              borderRadius: "14px",
                              border: "1px solid var(--line)",
                              background: "var(--panel2)",
                              cursor: "pointer",
                              fontSize: "13px",
                            }}
                          >
                            {ch.label}{" "}
                            <span
                              aria-hidden="true"
                              style={{ color: "var(--muted)" }}
                            >
                              {"×"}
                            </span>
                          </button>
                        </React.Fragment>
                      ))}
                    </div>
                    {v.showSmart ? (
                      <>
                        <button
                          role="switch"
                          aria-checked={v.smartOn}
                          onClick={v.toggleSmart}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            background: "transparent",
                            border: "0",
                            cursor: "pointer",
                            fontSize: "13px",
                            color: "var(--muted)",
                            padding: "0",
                          }}
                        >
                          <span
                            style={{
                              width: "30px",
                              height: "18px",
                              borderRadius: "9px",
                              background: v.smartTrack,
                              position: "relative",
                              transition: "background .15s",
                            }}
                          >
                            <span
                              style={{
                                position: "absolute",
                                top: "2px",
                                left: v.smartKnob,
                                width: "14px",
                                height: "14px",
                                borderRadius: "7px",
                                background: "var(--text)",
                                transition: "left .15s",
                              }}
                            ></span>
                          </span>
                          {tr("home.smart_search")}{" "}
                        </button>
                      </>
                    ) : null}
                  </div>
                  {v.modelLoading ? (
                    <>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          textAlign: "left",
                          padding: "10px 14px",
                          border: "1px solid var(--line)",
                          borderRadius: "8px",
                          background: "var(--panel)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "13px",
                            color: "var(--muted)",
                          }}
                        >
                          <span>
                            {
                              "Downloading search model (27 MB, cached after first load)"
                            }
                          </span>
                          <span
                            style={{ fontFamily: "'Geist Mono',monospace" }}
                          >
                            {v.modelPctLabel}
                          </span>
                        </div>
                        <div
                          style={{
                            height: "4px",
                            background: "var(--panel2)",
                            borderRadius: "2px",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: v.modelPctCss,
                              background: "var(--accent)",
                            }}
                          ></div>
                        </div>
                      </div>
                    </>
                  ) : null}
                </div>
              </section>
              {v.catalogEmpty ? (
                <>
                  <section
                    style={{
                      maxWidth: "560px",
                      margin: "8px auto 80px",
                      padding: "40px 28px",
                      textAlign: "center",
                      border: "1px dashed var(--line)",
                      borderRadius: "12px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "12px",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ fontSize: "20px", fontWeight: "600" }}>
                      {tr("home.the_catalog_is_empty")}
                    </div>
                    <p
                      style={{
                        margin: "0",
                        color: "var(--muted)",
                        lineHeight: "1.5",
                      }}
                    >
                      {
                        "No plugins have been published to this marketplace yet. Read the contribution guide to add the first one."
                      }
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: "10px",
                        flexWrap: "wrap",
                        justifyContent: "center",
                        marginTop: "6px",
                      }}
                    >
                      <a
                        href="https://github.com/georgsby/dev-digest-ai-marketplace/blob/main/CONTRIBUTING.md"
                        target="_blank"
                        rel="noopener"
                        style={{
                          height: "38px",
                          padding: "0 16px",
                          display: "flex",
                          alignItems: "center",
                          borderRadius: "8px",
                          background: "var(--accent)",
                          color: "var(--accent-ink)",
                          fontWeight: "600",
                          textDecoration: "none",
                        }}
                      >
                        {tr("home.read_contributing_md")}
                      </a>
                    </div>
                  </section>
                </>
              ) : null}
              {v.catalogFull ? (
                <>
                  {v.showRecent ? (
                    <>
                      <section
                        style={{
                          maxWidth: "1160px",
                          margin: "0 auto",
                          padding: "0 24px 28px",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "baseline",
                            marginBottom: "10px",
                          }}
                        >
                          <h2
                            style={{
                              margin: "0",
                              fontSize: "13px",
                              fontWeight: "500",
                              color: "var(--muted)",
                              textTransform: "uppercase",
                              letterSpacing: ".06em",
                            }}
                          >
                            {tr("home.recently_updated")}
                          </h2>
                          <a href="#/changelog" style={{ fontSize: "13px" }}>
                            {tr("home.all_releases")}
                          </a>
                        </div>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns:
                              "repeat(auto-fill,minmax(200px,1fr))",
                            gap: "10px",
                          }}
                        >
                          {(v.recent || []).map((r, __i) => (
                            <React.Fragment key={__i}>
                              <a
                                href={r.href}
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                  padding: "12px 14px",
                                  border: "1px solid var(--line)",
                                  borderRadius: "8px",
                                  background: "var(--panel)",
                                  color: "var(--text)",
                                  textDecoration: "none",
                                }}
                                className="st1"
                              >
                                <span
                                  style={{
                                    fontWeight: "500",
                                    fontSize: "14px",
                                  }}
                                >
                                  {r.plugin}
                                </span>
                                <span
                                  style={{
                                    fontFamily: "'Geist Mono',monospace",
                                    fontSize: "12px",
                                    color: "var(--muted)",
                                  }}
                                >
                                  {tr("home.version_prefix")}
                                  {r.version}
                                  {" · "}
                                  {r.date}
                                </span>
                              </a>
                            </React.Fragment>
                          ))}
                        </div>
                      </section>
                    </>
                  ) : null}
                  <section
                    style={{
                      maxWidth: "1160px",
                      margin: "0 auto",
                      padding: "0 24px 64px",
                      display: "flex",
                      gap: "28px",
                      flexWrap: "wrap",
                      alignItems: "flex-start",
                    }}
                  >
                    <aside
                      style={{
                        flex: "1 1 200px",
                        maxWidth: "240px",
                        minWidth: "200px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "22px",
                        fontSize: "14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                            marginBottom: "6px",
                          }}
                        >
                          {tr("home.type")}
                        </div>
                        {(v.typeFacets || []).map((f, __i) => (
                          <React.Fragment key={__i}>
                            <button
                              onClick={f.toggle}
                              aria-pressed={f.active}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "6px 6px",
                                border: "0",
                                background: "transparent",
                                cursor: "pointer",
                                borderRadius: "6px",
                                textAlign: "left",
                                color: f.fg,
                              }}
                              className="st2"
                            >
                              <span
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "4px",
                                  border: `1px solid ${f.boxBorder}`,
                                  background: f.boxBg,
                                  display: "grid",
                                  placeItems: "center",
                                  fontSize: "10px",
                                  color: "var(--accent-ink)",
                                }}
                              >
                                {f.mark}
                              </span>
                              <span
                                style={{
                                  width: "7px",
                                  height: "7px",
                                  borderRadius: "2px",
                                  background: f.color,
                                }}
                              ></span>
                              <span style={{ flex: "1" }}>{f.label}</span>
                              <span
                                style={{
                                  fontFamily: "'Geist Mono',monospace",
                                  fontSize: "12px",
                                  color: "var(--muted)",
                                }}
                              >
                                {f.count}
                              </span>
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "2px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                            marginBottom: "6px",
                          }}
                        >
                          {tr("home.category")}
                        </div>
                        {(v.catFacets || []).map((f, __i) => (
                          <React.Fragment key={__i}>
                            <button
                              onClick={f.toggle}
                              aria-pressed={f.active}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "6px 6px",
                                border: "0",
                                background: "transparent",
                                cursor: "pointer",
                                borderRadius: "6px",
                                textAlign: "left",
                                color: f.fg,
                              }}
                              className="st2"
                            >
                              <span
                                style={{
                                  width: "14px",
                                  height: "14px",
                                  borderRadius: "7px",
                                  border: `1px solid ${f.boxBorder}`,
                                  background: f.boxBg,
                                }}
                              ></span>
                              <span style={{ flex: "1" }}>{f.label}</span>
                              <span
                                style={{
                                  fontFamily: "'Geist Mono',monospace",
                                  fontSize: "12px",
                                  color: "var(--muted)",
                                }}
                              >
                                {f.count}
                              </span>
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                          }}
                        >
                          {tr("home.tags")}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexWrap: "wrap",
                            gap: "6px",
                          }}
                        >
                          {(v.tagFacets || []).map((f, __i) => (
                            <React.Fragment key={__i}>
                              <button
                                onClick={f.toggle}
                                aria-pressed={f.active}
                                style={{
                                  height: "26px",
                                  padding: "0 9px",
                                  borderRadius: "13px",
                                  border: `1px solid ${f.boxBorder}`,
                                  background: f.chipBg,
                                  cursor: "pointer",
                                  fontSize: "12px",
                                  fontFamily: "'Geist Mono',monospace",
                                }}
                              >
                                {f.label}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        <div
                          style={{
                            fontSize: "12px",
                            color: "var(--muted)",
                            textTransform: "uppercase",
                            letterSpacing: ".06em",
                          }}
                        >
                          {tr("home.plugin")}
                        </div>
                        <select
                          value={v.pluginFilter}
                          onChange={v.onPluginFilter}
                          style={{
                            height: "34px",
                            padding: "0 8px",
                            borderRadius: "6px",
                            border: "1px solid var(--line)",
                            background: "var(--panel)",
                          }}
                        >
                          <option value="">{tr("home.all_plugins")}</option>
                          {(v.pluginOptions || []).map((o, __i) => (
                            <React.Fragment key={__i}>
                              <option value={o.value}>{o.label}</option>
                            </React.Fragment>
                          ))}
                        </select>
                      </div>
                      <button
                        role="switch"
                        aria-checked={v.noCode}
                        onClick={v.toggleNoCode}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          background: "transparent",
                          border: "1px solid var(--line)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                          cursor: "pointer",
                          textAlign: "left",
                        }}
                      >
                        <span
                          style={{
                            width: "30px",
                            height: "18px",
                            borderRadius: "9px",
                            background: v.noCodeTrack,
                            position: "relative",
                            flex: "none",
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: "2px",
                              left: v.noCodeKnob,
                              width: "14px",
                              height: "14px",
                              borderRadius: "7px",
                              background: "var(--text)",
                            }}
                          ></span>
                        </span>
                        <span
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "2px",
                          }}
                        >
                          <span style={{ fontSize: "14px" }}>
                            {tr("home.runs_no_code")}
                          </span>
                          <span
                            style={{ fontSize: "12px", color: "var(--muted)" }}
                          >
                            {tr("home.hide_hooks_mcp_servers_scripts")}
                          </span>
                        </span>
                      </button>
                      {v.anyFilter ? (
                        <>
                          <button
                            onClick={v.clearFilters}
                            style={{
                              alignSelf: "flex-start",
                              background: "transparent",
                              border: "0",
                              color: "var(--accent-text)",
                              cursor: "pointer",
                              padding: "0",
                              fontSize: "13px",
                            }}
                          >
                            {tr("home.clear_filters")}
                          </button>
                        </>
                      ) : null}
                    </aside>
                    <div
                      style={{
                        flex: "999 1 480px",
                        minWidth: "0",
                        display: "flex",
                        flexDirection: "column",
                        gap: "14px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "12px",
                          flexWrap: "wrap",
                        }}
                      >
                        <div
                          aria-live="polite"
                          style={{
                            flex: "1",
                            fontSize: "14px",
                            color: "var(--muted)",
                          }}
                        >
                          {v.countLabel}
                        </div>
                        <label
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            fontSize: "13px",
                            color: "var(--muted)",
                          }}
                        >
                          {tr("home.sort")}{" "}
                          <select
                            value={v.sort}
                            onChange={v.onSort}
                            style={{
                              height: "32px",
                              padding: "0 8px",
                              borderRadius: "6px",
                              border: "1px solid var(--line)",
                              background: "var(--panel)",
                            }}
                          >
                            <option value="relevance">{tr("home.relevance")}</option>
                            <option value="updated">
                              {tr("home.recently_updated")}
                            </option>
                            <option value="name">{tr("home.name")}</option>
                          </select>
                        </label>
                      </div>
                      {v.hasNotice ? (
                        <>
                          <div
                            style={{
                              fontSize: "13px",
                              padding: "8px 12px",
                              borderRadius: "8px",
                              background: "var(--panel2)",
                              color: "var(--text)",
                            }}
                          >
                            {v.notice}
                          </div>
                        </>
                      ) : null}
                      {v.smartHint ? (
                        <>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "12px",
                              flexWrap: "wrap",
                              fontSize: "14px",
                              padding: "10px 14px",
                              borderRadius: "8px",
                              border: "1px solid var(--line)",
                              background: "var(--panel)",
                            }}
                          >
                            <span
                              style={{
                                flex: "1",
                                minWidth: "220px",
                                color: "var(--muted)",
                              }}
                            >
                              {
                                "Few matches. Smart search understands plain-English descriptions of what you need."
                              }
                            </span>
                            <button
                              onClick={v.toggleSmart}
                              style={{
                                height: "30px",
                                padding: "0 12px",
                                borderRadius: "6px",
                                border: "1px solid var(--accent)",
                                background: "transparent",
                                color: "var(--accent-text)",
                                cursor: "pointer",
                                fontSize: "13px",
                              }}
                            >
                              {tr("home.turn_on_smart_search")}
                            </button>
                          </div>
                        </>
                      ) : null}
                      {v.noResults ? (
                        <>
                          <div
                            style={{
                              padding: "40px 24px",
                              border: "1px dashed var(--line)",
                              borderRadius: "12px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                              alignItems: "center",
                              textAlign: "center",
                            }}
                          >
                            <div
                              style={{ fontSize: "18px", fontWeight: "600" }}
                            >
                              {tr("home.nothing_matched")}
                              {v.q}
                              {"”"}
                            </div>
                            <p
                              style={{
                                margin: "0",
                                color: "var(--muted)",
                                maxWidth: "440px",
                                lineHeight: "1.5",
                              }}
                            >
                              {
                                "Try fewer words, remove filters, or ask for it. A suggestion opens a pre-filled GitHub issue."
                              }
                            </p>
                            <div
                              style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap",
                                justifyContent: "center",
                              }}
                            >
                              {v.anyFilter ? (
                                <>
                                  <button
                                    onClick={v.clearFilters}
                                    style={{
                                      height: "36px",
                                      padding: "0 14px",
                                      borderRadius: "8px",
                                      border: "1px solid var(--line)",
                                      background: "var(--panel)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {tr("home.remove_filters")}
                                  </button>
                                </>
                              ) : null}
                              {v.offerSmart ? (
                                <>
                                  <button
                                    onClick={v.toggleSmart}
                                    style={{
                                      height: "36px",
                                      padding: "0 14px",
                                      borderRadius: "8px",
                                      border: "1px solid var(--line)",
                                      background: "var(--panel)",
                                      cursor: "pointer",
                                    }}
                                  >
                                    {tr("home.try_smart_search")}
                                  </button>
                                </>
                              ) : null}
                              <a
                                href={v.suggestUrl}
                                target="_blank"
                                rel="noopener"
                                style={{
                                  height: "36px",
                                  padding: "0 14px",
                                  display: "flex",
                                  alignItems: "center",
                                  borderRadius: "8px",
                                  background: "var(--accent)",
                                  color: "var(--accent-ink)",
                                  fontWeight: "600",
                                  textDecoration: "none",
                                }}
                              >
                                {tr("home.suggest_a_skill")}
                              </a>
                            </div>
                          </div>
                        </>
                      ) : null}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns:
                            "repeat(auto-fill,minmax(270px,1fr))",
                          gap: "12px",
                        }}
                      >
                        {(v.cards || []).map((c, __i) => (
                          <React.Fragment key={__i}>
                            <div
                              role="link"
                              tabIndex="0"
                              onClick={c.open}
                              onKeyDown={c.key}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "9px",
                                padding: "16px",
                                background: "var(--panel)",
                                border: "1px solid var(--line)",
                                borderRadius: "10px",
                                cursor: "pointer",
                                minHeight: "170px",
                              }}
                              className="st1"
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  fontFamily: "'Geist Mono',monospace",
                                  fontSize: "12px",
                                  color: "var(--muted)",
                                }}
                              >
                                <span
                                  style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "2px",
                                    background: c.typeColor,
                                  }}
                                ></span>
                                <span>{c.typeLabel}</span>
                                {c.semantic ? (
                                  <>
                                    <span
                                      style={{ color: "var(--accent-text)" }}
                                    >
                                      {tr("home.smart_match")}
                                    </span>
                                  </>
                                ) : null}
                                <span style={{ flex: "1" }}></span>
                                {c.runsCode ? (
                                  <>
                                    <span
                                      style={{
                                        color: "var(--warn)",
                                        border: "1px solid currentColor",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                      }}
                                    >
                                      {tr("home.runs_code")}
                                    </span>
                                  </>
                                ) : null}
                                {c.external ? (
                                  <>
                                    <span
                                      style={{
                                        color: "var(--muted)",
                                        border: "1px solid var(--line)",
                                        padding: "1px 6px",
                                        borderRadius: "4px",
                                        fontSize: "11px",
                                      }}
                                    >
                                      {tr("home.external")}
                                    </span>
                                  </>
                                ) : null}
                                {c.version ? (
                                  <span
                                    title={c.versionTitle}
                                    style={{
                                      fontFamily: "'Geist Mono',monospace",
                                      fontSize: "12px",
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {c.version}
                                  </span>
                                ) : null}
                              </div>
                              <div
                                style={{
                                  fontSize: "16px",
                                  fontWeight: "600",
                                  wordBreak: "break-word",
                                }}
                              >
                                {c.title}
                              </div>
                              <div
                                style={{
                                  fontSize: "14px",
                                  color: "var(--muted)",
                                  lineHeight: "1.45",
                                  maxHeight: "2.9em",
                                  overflow: "hidden",
                                }}
                              >
                                {(c.parts || []).map((p, __i) => (
                                  <React.Fragment key={__i}>
                                    <span
                                      style={{
                                        color: p.fg,
                                        background: p.bg,
                                        borderRadius: "2px",
                                      }}
                                    >
                                      {p.t}
                                    </span>
                                  </React.Fragment>
                                ))}
                              </div>
                              <div
                                style={{
                                  marginTop: "auto",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "8px",
                                  paddingTop: "4px",
                                }}
                              >
                                <span
                                  style={{
                                    fontFamily: "'Geist Mono',monospace",
                                    fontSize: "12px",
                                    color: "var(--muted)",
                                    flex: "1",
                                    minWidth: "0",
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {c.pluginVer}
                                </span>
                                {c.canBundle ? (
                                  <>
                                    <button
                                      onClick={c.toggleBundle}
                                      aria-pressed={c.inBundle}
                                      style={{
                                        height: "30px",
                                        padding: "0 10px",
                                        borderRadius: "6px",
                                        border: "1px solid var(--line)",
                                        background: c.bundleBg,
                                        cursor: "pointer",
                                        fontSize: "12px",
                                      }}
                                    >
                                      {c.bundleLabel}
                                    </button>
                                  </>
                                ) : null}
                                <button
                                  onClick={c.copy}
                                  style={{
                                    height: "30px",
                                    padding: "0 12px",
                                    borderRadius: "6px",
                                    border: "0",
                                    background: "var(--accent)",
                                    color: "var(--accent-ink)",
                                    fontWeight: "600",
                                    cursor: "pointer",
                                    fontSize: "12px",
                                  }}
                                >
                                  {c.copyLabel}
                                </button>
                              </div>
                            </div>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                  </section>
                </>
              ) : null}
            </>
          ) : null}
          {v.isPlugin ? (
            <>
              <div
                style={{
                  maxWidth: "1160px",
                  margin: "0 auto",
                  padding: "28px 24px 72px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <a
                  href={v.backHref}
                  style={{
                    fontSize: "14px",
                    color: "var(--muted)",
                    alignSelf: "flex-start",
                  }}
                >
                  {tr("plugin.back_to_results")}
                </a>
                <div
                  style={{
                    display: "flex",
                    gap: "32px",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div
                    style={{
                      flex: "999 1 520px",
                      minWidth: "0",
                      display: "flex",
                      flexDirection: "column",
                      gap: "32px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "12px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          fontFamily: "'Geist Mono',monospace",
                          fontSize: "12px",
                          color: "var(--muted)",
                        }}
                      >
                        <span
                          style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "2px",
                            background: "var(--c-plugin)",
                          }}
                        ></span>
                        {tr("plugin.plugin")}{" "}
                        {v.pg.category}
                      </div>
                      <h1
                        style={{
                          margin: "0",
                          fontSize: "34px",
                          letterSpacing: "-0.02em",
                          fontWeight: "600",
                        }}
                      >
                        {v.pg.title}
                      </h1>
                      <p
                        style={{
                          margin: "0",
                          fontSize: "17px",
                          lineHeight: "1.5",
                          color: "var(--muted)",
                          maxWidth: "640px",
                          textWrap: "pretty",
                        }}
                      >
                        {v.pg.description}
                      </p>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px 18px",
                          fontSize: "13px",
                          color: "var(--muted)",
                          fontFamily: "'Geist Mono',monospace",
                        }}
                      >
                        <span>
                          {tr("home.version_prefix")}
                          {v.pg.version}
                        </span>
                        <span>
                          {tr("plugin.by")}{" "}
                          {v.pg.author}
                        </span>
                        <span>{v.pg.license}</span>
                        <span>
                          {tr("plugin.updated")}{" "}
                          {v.pg.updated}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "6px",
                        }}
                      >
                        {(v.pg.tags || []).map((t, __i) => (
                          <React.Fragment key={__i}>
                            <a
                              href={t.href}
                              style={{
                                height: "24px",
                                padding: "0 9px",
                                display: "flex",
                                alignItems: "center",
                                borderRadius: "12px",
                                border: "1px solid var(--line)",
                                fontSize: "12px",
                                fontFamily: "'Geist Mono',monospace",
                                color: "var(--text)",
                                textDecoration: "none",
                              }}
                            >
                              {t.label}
                            </a>
                          </React.Fragment>
                        ))}
                      </div>
                    </div>
                    {v.pg.external ? (
                      <>
                        <div
                          style={{
                            padding: "16px",
                            border: "1px solid var(--line)",
                            borderRadius: "10px",
                            background: "var(--panel)",
                            fontSize: "14px",
                            lineHeight: "1.5",
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          <strong>{tr("plugin.external_contents_not_indexed")}</strong>
                          <span style={{ color: "var(--muted)" }}>
                            {
                              "This plugin lives in another repository. Only its marketplace entry is indexed, so components and the “What it runs” panel are unavailable. Review the source before installing."
                            }
                          </span>
                          <span
                            style={{
                              fontFamily: "'Geist Mono',monospace",
                              fontSize: "13px",
                            }}
                          >
                            {v.pg.source}
                          </span>
                        </div>
                      </>
                    ) : null}
                    {v.pg.hasComponents ? (
                      <>
                        <section
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "14px",
                          }}
                        >
                          <h2
                            style={{
                              margin: "0",
                              fontSize: "18px",
                              fontWeight: "600",
                            }}
                          >
                            {tr("plugin.components")}
                          </h2>
                          {(v.pg.groups || []).map((g, __i) => (
                            <React.Fragment key={__i}>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  border: "1px solid var(--line)",
                                  borderRadius: "10px",
                                  overflow: "hidden",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                    padding: "9px 14px",
                                    background: "var(--panel2)",
                                    fontSize: "12px",
                                    fontFamily: "'Geist Mono',monospace",
                                    color: "var(--muted)",
                                  }}
                                >
                                  <span
                                    style={{
                                      width: "8px",
                                      height: "8px",
                                      borderRadius: "2px",
                                      background: g.color,
                                    }}
                                  ></span>
                                  {g.label}
                                </div>
                                {(g.items || []).map((it, __i) => (
                                  <React.Fragment key={__i}>
                                    <div
                                      id={it.anchor}
                                      style={{
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: "6px",
                                        padding: "14px",
                                        borderTop: "1px solid var(--line)",
                                        background: it.bg,
                                      }}
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "10px",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        <span style={{ fontWeight: "600" }}>
                                          {it.name}
                                        </span>
                                        {it.hasInvocation ? (
                                          <>
                                            <button
                                              onClick={it.copyInv}
                                              title={tr("plugin.copy_invocation")}
                                              style={{
                                                fontFamily:
                                                  "'Geist Mono',monospace",
                                                fontSize: "12px",
                                                padding: "2px 8px",
                                                borderRadius: "5px",
                                                border: "1px solid var(--line)",
                                                background: "var(--panel)",
                                                cursor: "pointer",
                                                color: "var(--accent-text)",
                                              }}
                                            >
                                              {it.invocation}
                                            </button>
                                          </>
                                        ) : null}
                                      </div>
                                      <div
                                        style={{
                                          fontSize: "14px",
                                          lineHeight: "1.5",
                                          color: "var(--muted)",
                                          textWrap: "pretty",
                                        }}
                                      >
                                        {it.description}
                                      </div>
                                      {it.hasMeta ? (
                                        <>
                                          <div
                                            style={{
                                              fontFamily:
                                                "'Geist Mono',monospace",
                                              fontSize: "12px",
                                              color: "var(--muted)",
                                            }}
                                          >
                                            {it.meta}
                                          </div>
                                        </>
                                      ) : null}
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            </React.Fragment>
                          ))}
                        </section>
                      </>
                    ) : null}
                    {v.pg.hasConfig ? (
                      <>
                        <section
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          <h2
                            style={{
                              margin: "0",
                              fontSize: "18px",
                              fontWeight: "600",
                            }}
                          >
                            {tr("plugin.configuration")}
                          </h2>
                          <div
                            style={{
                              border: "1px solid var(--line)",
                              borderRadius: "10px",
                              overflow: "hidden",
                            }}
                          >
                            {(v.pg.config || []).map((u, __i) => (
                              <React.Fragment key={__i}>
                                <div
                                  style={{
                                    display: "flex",
                                    gap: "12px",
                                    alignItems: "center",
                                    padding: "12px 14px",
                                    borderBottom: "1px solid var(--line)",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <code
                                    style={{
                                      fontFamily: "'Geist Mono',monospace",
                                      fontSize: "13px",
                                    }}
                                  >
                                    {u.key}
                                  </code>
                                  <span
                                    style={{
                                      flex: "1",
                                      color: "var(--muted)",
                                      fontSize: "14px",
                                    }}
                                  >
                                    {u.title}
                                  </span>
                                  {u.sensitive ? (
                                    <>
                                      <span
                                        style={{
                                          fontSize: "11px",
                                          fontFamily: "'Geist Mono',monospace",
                                          color: "var(--warn)",
                                          border: "1px solid currentColor",
                                          borderRadius: "4px",
                                          padding: "1px 6px",
                                        }}
                                      >
                                        {tr("plugin.secret")}
                                      </span>
                                    </>
                                  ) : null}
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </section>
                      </>
                    ) : null}
                    {v.pg.hasDeps ? (
                      <>
                        <section
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          <h2
                            style={{
                              margin: "0",
                              fontSize: "18px",
                              fontWeight: "600",
                            }}
                          >
                            {tr("plugin.dependencies")}
                          </h2>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "10px",
                              flexWrap: "wrap",
                              padding: "16px",
                              border: "1px solid var(--line)",
                              borderRadius: "10px",
                              background: "var(--panel)",
                            }}
                          >
                            <span
                              style={{
                                padding: "6px 10px",
                                borderRadius: "6px",
                                background: "var(--accent)",
                                color: "var(--accent-ink)",
                                fontFamily: "'Geist Mono',monospace",
                                fontSize: "13px",
                                fontWeight: "500",
                              }}
                            >
                              {v.pg.name}
                            </span>
                            <span
                              style={{
                                color: "var(--muted)",
                                fontFamily: "'Geist Mono',monospace",
                              }}
                            >
                              {"→"}
                            </span>
                            {(v.pg.deps || []).map((d, __i) => (
                              <React.Fragment key={__i}>
                                <a
                                  href={d.href}
                                  style={{
                                    padding: "6px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid var(--line)",
                                    fontFamily: "'Geist Mono',monospace",
                                    fontSize: "13px",
                                    color: "var(--text)",
                                    textDecoration: "none",
                                  }}
                                >
                                  {d.name}
                                </a>
                              </React.Fragment>
                            ))}
                          </div>
                        </section>
                      </>
                    ) : null}
                    {v.pg.hasReadme ? (
                      <>
                        <section
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          <h2
                            style={{
                              margin: "0",
                              fontSize: "18px",
                              fontWeight: "600",
                            }}
                          >
                            {tr("plugin.readme")}
                          </h2>
                          <div
                            style={{
                              padding: "20px",
                              border: "1px solid var(--line)",
                              borderRadius: "10px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "12px",
                              fontSize: "15px",
                              lineHeight: "1.6",
                            }}
                          >
                            {(v.pg.readme || []).map((r, __i) => (
                              <React.Fragment key={__i}>
                                <p style={{ margin: "0", textWrap: "pretty" }}>
                                  {r}
                                </p>
                              </React.Fragment>
                            ))}
                          </div>
                        </section>
                      </>
                    ) : null}
                    {v.pg.hasReleases ? (
                      <>
                        <section
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "baseline",
                            }}
                          >
                            <h2
                              style={{
                                margin: "0",
                                fontSize: "18px",
                                fontWeight: "600",
                              }}
                            >
                              {tr("plugin.releases")}
                            </h2>
                            {v.showChangelog ? (
                              <>
                                <a
                                  href={v.pg.feedHref}
                                  style={{ fontSize: "13px" }}
                                >
                                  {tr("plugin.atom_feed")}
                                </a>
                              </>
                            ) : null}
                          </div>
                          <div
                            style={{ display: "flex", flexDirection: "column" }}
                          >
                            {(v.pg.releases || []).map((r, __i) => (
                              <React.Fragment key={__i}>
                                <div
                                  style={{
                                    display: "grid",
                                    gridTemplateColumns: "110px minmax(0,1fr)",
                                    gap: "16px",
                                    padding: "12px 0",
                                    borderTop: "1px solid var(--line)",
                                  }}
                                >
                                  <div
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "2px",
                                      fontFamily: "'Geist Mono',monospace",
                                      fontSize: "13px",
                                    }}
                                  >
                                    <span>
                                      {tr("home.version_prefix")}
                                      {r.v}
                                    </span>
                                    <span
                                      style={{
                                        color: "var(--muted)",
                                        fontSize: "12px",
                                      }}
                                    >
                                      {r.date}
                                    </span>
                                  </div>
                                  <ul
                                    style={{
                                      margin: "0",
                                      paddingLeft: "18px",
                                      fontSize: "14px",
                                      lineHeight: "1.55",
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {(r.notes || []).map((n, __i) => (
                                      <React.Fragment key={__i}>
                                        <li>{n}</li>
                                      </React.Fragment>
                                    ))}
                                  </ul>
                                </div>
                              </React.Fragment>
                            ))}
                          </div>
                        </section>
                      </>
                    ) : null}
                  </div>
                  <aside
                    style={{
                      flex: "1 1 320px",
                      maxWidth: "400px",
                      minWidth: "280px",
                      display: "flex",
                      flexDirection: "column",
                      gap: "16px",
                      position: "sticky",
                      top: "16px",
                    }}
                  >
                    <div
                      style={{
                        border: "1px solid var(--line)",
                        borderRadius: "10px",
                        background: "var(--panel)",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        role="tablist"
                        style={{
                          display: "flex",
                          borderBottom: "1px solid var(--line)",
                        }}
                      >
                        {(v.installTabs || []).map((t, __i) => (
                          <React.Fragment key={__i}>
                            <button
                              role="tab"
                              aria-selected={t.active}
                              onClick={t.select}
                              style={{
                                flex: "1",
                                height: "38px",
                                border: "0",
                                borderBottom: `2px solid ${t.border}`,
                                background: "transparent",
                                cursor: "pointer",
                                fontSize: "13px",
                                color: t.fg,
                              }}
                            >
                              {t.label}
                            </button>
                          </React.Fragment>
                        ))}
                      </div>
                      <div
                        style={{
                          padding: "14px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "10px",
                        }}
                      >
                        <pre
                          style={{
                            margin: "0",
                            padding: "12px",
                            background: "var(--bg)",
                            border: "1px solid var(--line)",
                            borderRadius: "8px",
                            fontFamily: "'Geist Mono',monospace",
                            fontSize: "12.5px",
                            lineHeight: "1.6",
                            whiteSpace: "pre-wrap",
                            wordBreak: "break-all",
                          }}
                        >
                          {v.installCmd}
                        </pre>
                        {v.installNote ? (
                          <>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--muted)",
                                lineHeight: "1.5",
                              }}
                            >
                              {v.installNoteText}
                            </div>
                          </>
                        ) : null}
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button
                            onClick={v.copyInstall}
                            style={{
                              flex: "1",
                              height: "36px",
                              borderRadius: "8px",
                              border: "0",
                              background: "var(--accent)",
                              color: "var(--accent-ink)",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            {v.copyInstallLabel}
                          </button>
                          {v.showBundle ? (
                            <>
                              <button
                                onClick={v.pg.toggleBundle}
                                style={{
                                  height: "36px",
                                  padding: "0 12px",
                                  borderRadius: "8px",
                                  border: "1px solid var(--line)",
                                  background: v.pg.bundleBg,
                                  cursor: "pointer",
                                  fontSize: "13px",
                                }}
                              >
                                {v.pg.bundleLabel}
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                    </div>
                    {v.pg.hasSurface ? (
                      <>
                        <div
                          style={{
                            border: "1px solid var(--line)",
                            borderRadius: "10px",
                            background: "var(--panel)",
                            display: "flex",
                            flexDirection: "column",
                          }}
                        >
                          <div
                            style={{
                              padding: "14px",
                              display: "flex",
                              flexDirection: "column",
                              gap: "8px",
                              borderBottom: "1px solid var(--line)",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{ fontWeight: "600", fontSize: "15px" }}
                              >
                                {tr("plugin.what_it_runs")}
                              </span>
                              <span
                                style={{
                                  fontSize: "12px",
                                  fontFamily: "'Geist Mono',monospace",
                                  border: "1px solid currentColor",
                                  borderRadius: "4px",
                                  padding: "2px 7px",
                                  color: v.pg.surfaceColor,
                                }}
                              >
                                {v.pg.surfaceBadge}
                              </span>
                            </div>
                            <div
                              style={{
                                fontSize: "12px",
                                color: "var(--muted)",
                                lineHeight: "1.5",
                              }}
                            >
                              {
                                "Lists what the plugin's files declare. It does not judge whether that is safe. See "
                              }
                              <a
                                href="https://github.com/georgsby/dev-digest-ai-marketplace/blob/main/docs/SECURITY.md"
                                target="_blank"
                                rel="noopener"
                              >
                                {tr("plugin.security_md")}
                              </a>
                              {"."}
                            </div>
                          </div>
                          {(v.pg.surface || []).map((s, __i) => (
                            <React.Fragment key={__i}>
                              <div
                                style={{
                                  padding: "10px 14px",
                                  borderBottom: "1px solid var(--line)",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "4px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    fontSize: "13px",
                                  }}
                                >
                                  <span>{s.label}</span>
                                  <span
                                    style={{
                                      fontFamily: "'Geist Mono',monospace",
                                      color: "var(--muted)",
                                      fontSize: "12px",
                                    }}
                                  >
                                    {s.count}
                                  </span>
                                </div>
                                {(s.items || []).map((i, __i) => (
                                  <React.Fragment key={__i}>
                                    <div
                                      style={{
                                        fontFamily: "'Geist Mono',monospace",
                                        fontSize: "12px",
                                        color: i.fg,
                                        wordBreak: "break-word",
                                        lineHeight: "1.5",
                                      }}
                                    >
                                      {i.t}
                                    </div>
                                  </React.Fragment>
                                ))}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      </>
                    ) : null}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "8px",
                        fontSize: "14px",
                      }}
                    >
                      <a href={v.pg.ghHref} target="_blank" rel="noopener">
                        {tr("plugin.view_on_github")}
                      </a>
                      <a href={v.pg.issueHref} target="_blank" rel="noopener">
                        {tr("plugin.report_an_issue")}
                      </a>
                    </div>
                  </aside>
                </div>
              </div>
            </>
          ) : null}
          {v.isChangelog ? (
            <>
              <div
                style={{
                  maxWidth: "820px",
                  margin: "0 auto",
                  padding: "48px 24px 72px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    gap: "16px",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    <h1
                      style={{
                        margin: "0",
                        fontSize: "32px",
                        letterSpacing: "-0.02em",
                        fontWeight: "600",
                      }}
                    >
                      {tr("changelog.changelog")}
                    </h1>
                    <p style={{ margin: "0", color: "var(--muted)" }}>
                      {tr("changelog.every_release_newest_first_dates")}
                    </p>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: "10px",
                      alignItems: "center",
                    }}
                  >
                    <select
                      value={v.clFilter}
                      onChange={v.onClFilter}
                      aria-label={tr("changelog.filter_by_plugin")}
                      style={{
                        height: "36px",
                        padding: "0 10px",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        background: "var(--panel)",
                      }}
                    >
                      <option value="">{tr("home.all_plugins")}</option>
                      {(v.pluginOptions || []).map((o, __i) => (
                        <React.Fragment key={__i}>
                          <option value={o.value}>{o.label}</option>
                        </React.Fragment>
                      ))}
                    </select>
                    <a
                      href={v.clFeed}
                      style={{
                        height: "36px",
                        padding: "0 12px",
                        display: "flex",
                        alignItems: "center",
                        borderRadius: "8px",
                        border: "1px solid var(--line)",
                        fontSize: "13px",
                        color: "var(--text)",
                        textDecoration: "none",
                        fontFamily: "'Geist Mono',monospace",
                      }}
                    >
                      {tr("changelog.feed_xml")}
                    </a>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {(v.changelog || []).map((r, __i) => (
                    <React.Fragment key={__i}>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "120px minmax(0,1fr)",
                          gap: "20px",
                          padding: "18px 0",
                          borderTop: "1px solid var(--line)",
                        }}
                      >
                        <div
                          style={{
                            fontFamily: "'Geist Mono',monospace",
                            fontSize: "13px",
                            color: "var(--muted)",
                            paddingTop: "2px",
                          }}
                        >
                          {r.date}
                        </div>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "8px",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              gap: "10px",
                              alignItems: "baseline",
                              flexWrap: "wrap",
                            }}
                          >
                            <a
                              href={r.href}
                              style={{
                                fontWeight: "600",
                                fontSize: "16px",
                                color: "var(--text)",
                              }}
                            >
                              {r.plugin}
                            </a>
                            <span
                              style={{
                                fontFamily: "'Geist Mono',monospace",
                                fontSize: "13px",
                                color: "var(--accent-text)",
                              }}
                            >
                              {tr("home.version_prefix")}
                              {r.version}
                            </span>
                          </div>
                          <ul
                            style={{
                              margin: "0",
                              paddingLeft: "18px",
                              fontSize: "14px",
                              lineHeight: "1.55",
                              color: "var(--muted)",
                            }}
                          >
                            {(r.notes || []).map((n, __i) => (
                              <React.Fragment key={__i}>
                                <li>{n}</li>
                              </React.Fragment>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </>
          ) : null}
          {v.isBundle ? (
            <>
              <div
                style={{
                  maxWidth: "1000px",
                  margin: "0 auto",
                  padding: "48px 24px 72px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "24px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                  }}
                >
                  <h1
                    style={{
                      margin: "0",
                      fontSize: "32px",
                      letterSpacing: "-0.02em",
                      fontWeight: "600",
                    }}
                  >
                    {tr("bundle.bundle")}
                  </h1>
                  <p style={{ margin: "0", color: "var(--muted)" }}>
                    {
                      "Install several plugins at once. The link to this page includes your selection."
                    }
                  </p>
                </div>
                {v.bundleEmpty ? (
                  <>
                    <div
                      style={{
                        padding: "36px",
                        border: "1px dashed var(--line)",
                        borderRadius: "12px",
                        textAlign: "center",
                        color: "var(--muted)",
                      }}
                    >
                      {tr("bundle.no_plugins_yet_use")}{" "}
                      <strong style={{ color: "var(--text)" }}>
                        {tr("bundle.add_to_bundle")}
                      </strong>
                      {" "}{tr("bundle.on_any_plugin_card")}{" "}
                      <a href="#/?type=plugin">{tr("bundle.browse_plugins")}</a>
                    </div>
                  </>
                ) : null}
                {v.bundleFull ? (
                  <>
                    <div
                      style={{
                        display: "flex",
                        gap: "28px",
                        flexWrap: "wrap",
                        alignItems: "flex-start",
                      }}
                    >
                      <div
                        style={{
                          flex: "1 1 280px",
                          display: "flex",
                          flexDirection: "column",
                          gap: "8px",
                        }}
                      >
                        {(v.bundleItems || []).map((b, __i) => (
                          <React.Fragment key={__i}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                                padding: "12px 14px",
                                border: "1px solid var(--line)",
                                borderRadius: "8px",
                                background: "var(--panel)",
                              }}
                            >
                              <div
                                style={{
                                  flex: "1",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "2px",
                                }}
                              >
                                <a
                                  href={b.href}
                                  style={{
                                    fontWeight: "600",
                                    color: "var(--text)",
                                  }}
                                >
                                  {b.name}
                                </a>
                                {b.auto ? (
                                  <>
                                    <span
                                      style={{
                                        fontSize: "12px",
                                        color: "var(--muted)",
                                      }}
                                    >
                                      {tr("bundle.added_because")}{" "}
                                      {b.because}
                                      {" "}{tr("bundle.needs_it")}
                                    </span>
                                  </>
                                ) : null}
                              </div>
                              {b.runsCode ? (
                                <>
                                  <span
                                    style={{
                                      fontSize: "11px",
                                      fontFamily: "'Geist Mono',monospace",
                                      color: "var(--warn)",
                                      border: "1px solid currentColor",
                                      borderRadius: "4px",
                                      padding: "1px 6px",
                                    }}
                                  >
                                    {tr("home.runs_code")}
                                  </span>
                                </>
                              ) : null}
                              {b.removable ? (
                                <>
                                  <button
                                    onClick={b.remove}
                                    aria-label={tr("bundle.remove")}
                                    style={{
                                      width: "28px",
                                      height: "28px",
                                      borderRadius: "6px",
                                      border: "1px solid var(--line)",
                                      background: "transparent",
                                      cursor: "pointer",
                                      color: "var(--muted)",
                                    }}
                                  >
                                    {"×"}
                                  </button>
                                </>
                              ) : null}
                            </div>
                          </React.Fragment>
                        ))}
                        <div
                          style={{
                            marginTop: "8px",
                            padding: "12px 14px",
                            borderRadius: "8px",
                            background: "var(--panel2)",
                            fontSize: "13px",
                            lineHeight: "1.6",
                            color: "var(--muted)",
                          }}
                        >
                          {v.bundleSummary}
                        </div>
                      </div>
                      <div
                        style={{
                          flex: "2 1 420px",
                          minWidth: "0",
                          border: "1px solid var(--line)",
                          borderRadius: "10px",
                          background: "var(--panel)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          role="tablist"
                          style={{
                            display: "flex",
                            borderBottom: "1px solid var(--line)",
                          }}
                        >
                          {(v.bundleTabs || []).map((t, __i) => (
                            <React.Fragment key={__i}>
                              <button
                                role="tab"
                                aria-selected={t.active}
                                onClick={t.select}
                                style={{
                                  flex: "1",
                                  height: "40px",
                                  border: "0",
                                  borderBottom: `2px solid ${t.border}`,
                                  background: "transparent",
                                  cursor: "pointer",
                                  fontSize: "13px",
                                  color: t.fg,
                                }}
                              >
                                {t.label}
                              </button>
                            </React.Fragment>
                          ))}
                        </div>
                        <div
                          style={{
                            padding: "14px",
                            display: "flex",
                            flexDirection: "column",
                            gap: "10px",
                          }}
                        >
                          <pre
                            style={{
                              margin: "0",
                              padding: "14px",
                              background: "var(--bg)",
                              border: "1px solid var(--line)",
                              borderRadius: "8px",
                              fontFamily: "'Geist Mono',monospace",
                              fontSize: "12.5px",
                              lineHeight: "1.6",
                              whiteSpace: "pre-wrap",
                              wordBreak: "break-all",
                              maxHeight: "360px",
                              overflow: "auto",
                            }}
                          >
                            {v.bundleOut}
                          </pre>
                          {v.bundleIsSettings ? (
                            <>
                              <div
                                style={{
                                  fontSize: "12px",
                                  color: "var(--muted)",
                                }}
                              >
                                {tr("bundle.merge_this_into_your_existing")}{" "}
                                <code
                                  style={{
                                    fontFamily: "'Geist Mono',monospace",
                                  }}
                                >
                                  {tr("bundle.claude_settings_json")}
                                </code>
                                {" "}{tr("bundle.rather_than_replacing_it")}
                              </div>
                            </>
                          ) : null}
                          <button
                            onClick={v.copyBundle}
                            style={{
                              alignSelf: "flex-start",
                              height: "36px",
                              padding: "0 16px",
                              borderRadius: "8px",
                              border: "0",
                              background: "var(--accent)",
                              color: "var(--accent-ink)",
                              fontWeight: "600",
                              cursor: "pointer",
                            }}
                          >
                            {tr("bundle.copy")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </div>
            </>
          ) : null}
          {v.isNotFound ? (
            <>
              <div
                style={{
                  maxWidth: "560px",
                  margin: "0 auto",
                  padding: "96px 24px",
                  textAlign: "center",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Geist Mono',monospace",
                    color: "var(--muted)",
                  }}
                >
                  {"404"}
                </div>
                <h1
                  style={{ margin: "0", fontSize: "28px", fontWeight: "600" }}
                >
                  {tr("notFound.this_page_doesn_t_exist")}
                </h1>
                <a
                  href="#/"
                  style={{
                    height: "38px",
                    padding: "0 16px",
                    display: "flex",
                    alignItems: "center",
                    borderRadius: "8px",
                    background: "var(--accent)",
                    color: "var(--accent-ink)",
                    fontWeight: "600",
                    textDecoration: "none",
                  }}
                >
                  {tr("home.search_the_catalog")}
                </a>
              </div>
            </>
          ) : null}
        </main>
        <footer style={{ borderTop: "1px solid var(--line)" }}>
          <div
            style={{
              maxWidth: "1160px",
              margin: "0 auto",
              padding: "18px 24px",
              display: "flex",
              gap: "8px 20px",
              flexWrap: "wrap",
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            {v.built ? (
              <span>
                {tr("footer.built")}{" "}{v.built}
                {v.commitShort ? (
                  <>
                    {" "}{tr("footer.from")}{" "}
                    <a
                      href={v.commitHref}
                      target="_blank"
                      rel="noopener"
                      style={{ fontFamily: "'Geist Mono',monospace" }}
                    >
                      {v.commitShort}
                    </a>
                  </>
                ) : null}
              </span>
            ) : null}
            <span style={{ flex: "1" }}></span>
            <a href="catalog.json">{tr("footer.catalog_json")}</a>
            <a
              href="https://github.com/georgsby/dev-digest-ai-marketplace/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noopener"
            >
              {tr("footer.contributing")}
            </a>
          </div>
        </footer>
        {v.hasToast ? (
          <>
            <div
              role="status"
              style={{
                position: "fixed",
                bottom: "24px",
                left: "50%",
                transform: "translateX(-50%)",
                padding: "10px 16px",
                borderRadius: "8px",
                background: "var(--text)",
                color: "var(--bg)",
                fontSize: "14px",
                boxShadow: "0 8px 24px rgba(0,0,0,.25)",
              }}
            >
              {v.toast}
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}
