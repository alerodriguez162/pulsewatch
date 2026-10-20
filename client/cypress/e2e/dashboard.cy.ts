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
});
