(function(){
  const rootEl = document.getElementById('react-game-tabs');
  if (!rootEl || !window.React || !window.ReactDOM) return;

  const e = React.createElement;
  const games = [
    { id: 'snake', label: '🐍 Neon Snake' },
    { id: 'silhouette', label: '🎌 Anime Guesser' },
    { id: 'tap', label: '🦭 Seal Sky Dash' }
  ];

  function ArcadeTabs(){
    const [activeGame, setActiveGame] = React.useState('snake');

    React.useEffect(() => {
      const onTabChanged = (event) => setActiveGame(event.detail || 'snake');
      window.addEventListener('arcade:tab-changed', onTabChanged);
      return () => window.removeEventListener('arcade:tab-changed', onTabChanged);
    }, []);

    return e('div', { className: 'game-tabs' },
      games.map((game) => e('button', {
        key: game.id,
        type: 'button',
        className: 'game-tab' + (activeGame === game.id ? ' active' : ''),
        'data-game': game.id,
        onClick: function(){
          setActiveGame(game.id);
          if (window.switchTab) window.switchTab(game.id);
        }
      }, game.label))
    );
  }

  ReactDOM.createRoot(rootEl).render(e(ArcadeTabs));
})();