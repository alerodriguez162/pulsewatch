describe('settings', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard.json' });
    cy.visit('/settings');
  });

  it('keeps the chosen dashboard refresh interval', () => {
    cy.get('[data-testid=poll-interval]').select('30000');
    cy.get('[data-testid=poll-summary]').should('contain', '30');
    cy.window().its('localStorage').invoke('getItem', 'pulsewatch-poll-ms').should('eq', '30000');
  });

  it('toggles the theme', () => {
    cy.get('[data-testid=theme-toggle]').invoke('attr', 'aria-pressed').then((pressed) => {
      cy.get('[data-testid=theme-toggle]').click();
      cy.get('[data-testid=theme-toggle]').should('have.attr', 'aria-pressed', pressed === 'true' ? 'false' : 'true');
      cy.get('html').should(pressed === 'true' ? 'not.have.class' : 'have.class', 'dark');
    });
  });

  it('refreshes monitoring from the header', () => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard.json' }).as('dashboard');
    cy.visit('/');
    cy.wait('@dashboard');
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard-recovered.json' }).as('refreshed');
    cy.get('[data-testid=refresh-monitoring]').click();
    cy.wait('@refreshed');
    cy.contains('[data-testid=endpoint-row]', 'Billing').find('[data-testid=status-badge]').should('contain', 'Up');
  });
});
