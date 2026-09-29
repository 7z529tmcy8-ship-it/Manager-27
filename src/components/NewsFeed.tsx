import type { NewsItem } from '../game/types';

/** Die neuesten Schlagzeilen rund um den Spieler, seinen Rivalen und die Ligen. */
export default function NewsFeed({ news, limit = 8 }: { news: NewsItem[]; limit?: number }) {
  if (!news.length) return null;
  return (
    <div className="panel news">
      <h2>Schlagzeilen</h2>
      <ul>
        {news.slice(0, limit).map((n, i) => (
          <li key={i}>
            <span className={`pill tag-${n.tag.toLowerCase()}`}>{n.tag}</span>
            <span className="news-text">{n.text}</span>
            <small>{n.season} · {n.half === 1 ? 'Winter' : 'Sommer'}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}
