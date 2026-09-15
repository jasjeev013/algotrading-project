const TradeLogTable = ({ tradeLog }) => (
  <div className="section-block">
    <h2>Trade Log</h2>
    <div className="table-container">
      <table>
        <thead>
          <tr>
            <th>Type</th>
            <th>Entry Date</th>
            <th>Exit Date</th>
            <th>Entry Price</th>
            <th>Exit Price</th>
            <th>P/L ($)</th>
            <th>Return (%)</th>
          </tr>
        </thead>
        <tbody>
          {tradeLog.map((trade, index) => (
            <tr key={index}>
              <td className={trade.type === "LONG" ? "positive" : "negative"}>
                {trade.type}
              </td>
              <td>{trade.entry_date}</td>
              <td>{trade.exit_date}</td>
              <td>${trade.entry_price.toFixed(2)}</td>
              <td>${trade.exit_price.toFixed(2)}</td>
              <td className={trade.profit_loss >= 0 ? "positive" : "negative"}>
                ${trade.profit_loss.toFixed(2)}
              </td>
              <td
                className={
                  trade.net_return_pct >= 0 ? "positive" : "negative"
                }
              >
                {trade.net_return_pct.toFixed(2)}%
              </td>
            </tr>
          ))}
          {tradeLog.length === 0 && (
            <tr>
              <td
                colSpan="7"
                style={{ textAlign: "center", color: "var(--text-muted)" }}
              >
                No trades executed during this period.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default TradeLogTable;
