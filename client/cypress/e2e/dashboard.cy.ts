describe('dashboard', () => {
  it('renders monitored endpoints from the API fixture', () => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard.json' }).as('dashboard');
    cy.visit('/');
    cy.wait('@dashboard');
    cy.get('[data-testid=dashboard]').should('be.visible');
    cy.get('[data-testid=endpoint-row]').should('have.length', 2);
    cy.contains('Example');
    cy.contains('99.5%');
    cy.contains('120 ms');
    cy.contains('HTTP 503 did not meet the expected status.');
  });

  it('shows an empty state when no endpoints exist', () => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'empty-dashboard.json' }).as('dashboard');
    cy.visit('/');
    cy.wait('@dashboard');
    cy.get('[data-testid=empty-state]').should('contain', 'No endpoints yet');
  });

  it('shows an error state when the API fails', () => {
    cy.intercept('GET', '/api/dashboard', { statusCode: 500, body: { error: 'Database unavailable.' } }).as(
      'dashboard',
    );
    cy.visit('/');
    cy.wait('@dashboard');
    cy.get('[data-testid=error-state]').should('contain', 'Database unavailable.');
  });

  it('filters the endpoint table', () => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard.json' }).as('dashboard');
    cy.visit('/');
    cy.wait('@dashboard');
    cy.get('[data-testid=endpoint-filter]').type('Billing');
    cy.get('[data-testid=endpoint-row]').should('have.length', 1);
    cy.contains('[data-testid=endpoint-row]', 'Billing');
    cy.contains('[data-testid=endpoint-row]', 'Example').should('not.exist');
  });
});
