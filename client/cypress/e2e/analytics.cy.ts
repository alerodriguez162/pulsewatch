describe('analytics', () => {
  it('charts latency and uptime from the dashboard fixture', () => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard.json' }).as('dashboard');
    cy.visit('/analytics');
    cy.wait('@dashboard');
    cy.get('[data-testid=analytics]').should('be.visible');
    cy.contains('Average latency by endpoint');
    cy.contains('Example: 120');
    cy.contains('Uptime percent by endpoint');
    cy.contains('Billing: 40');
  });
});
