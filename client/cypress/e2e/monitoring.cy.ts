describe('monitoring history', () => {
  it('renders probe history and runs a manual check', () => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard.json' });
    cy.intercept('GET', '/api/endpoints/ep-up', { fixture: 'endpoint.json' }).as('endpoint');
    cy.intercept('GET', '/api/endpoints/ep-up/history', { fixture: 'history.json' }).as('history');
    cy.intercept('GET', '/api/incidents*', { fixture: 'incidents.json' }).as('incidents');
    cy.visit('/monitoring/ep-up');
    cy.wait('@endpoint');
    cy.wait('@history');
    cy.wait('@incidents');
    cy.get('[data-testid=monitoring]').should('contain', 'Example');
    cy.contains('Latency over the last 24 hours');
    cy.contains('120');
    cy.contains('Latency recovered.');
    cy.intercept('POST', '/api/endpoints/ep-up/check', {
      statusCode: 200,
      body: { success: true, statusCode: 200, latencyMs: 80, errorCategory: null },
    }).as('check');
    cy.get('[data-testid=check-now]').click();
    cy.wait('@check');
  });
});
