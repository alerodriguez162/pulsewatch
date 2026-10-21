describe('alert thresholds', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard.json' }).as('dashboard');
    cy.visit('/alerts');
    cy.wait('@dashboard');
  });

  it('filters alert rules by name', () => {
    cy.get('[data-testid=alert-filter]').type('Billing');
    cy.get('[data-testid=alert-rule]').should('have.length', 1);
    cy.get('[data-testid=alert-rule]').should('contain', 'Billing');
  });

  it('runs a manual check for one rule', () => {
    cy.intercept('POST', '/api/endpoints/ep-up/check', {
      statusCode: 200,
      body: { success: true, statusCode: 200, latencyMs: 80, errorCategory: null },
    }).as('check');
    cy.contains('li', 'Example').find('[data-testid=check-now]').click();
    cy.wait('@check');
    cy.contains('Checked Example.');
  });

  it('filters incident history', () => {
    cy.get('[data-testid=incident-row]').should('have.length', 2);
    cy.get('[data-testid=incident-filter]').select('resolved');
    cy.get('[data-testid=incident-row]').should('have.length', 1);
    cy.contains('[data-testid=incident-row]', 'Latency recovered.');
  });

  it('rejects a threshold outside the allowed range', () => {
    cy.intercept('PATCH', '/api/endpoints/**', { statusCode: 200, body: {} }).as('save');
    cy.contains('li', 'Example').find('[data-testid=failure-threshold]').clear().type('0');
    cy.contains('li', 'Example').find('[data-testid=save-thresholds]').click();
    cy.contains('Thresholds must stay within the allowed range.');
    cy.get('@save.all').should('have.length', 0);
  });

  it('saves a failure threshold', () => {
    cy.intercept('PATCH', '/api/endpoints/ep-up', { statusCode: 200, body: {} }).as('save');
    cy.contains('li', 'Example').find('[data-testid=failure-threshold]').clear().type('3');
    cy.contains('li', 'Example').find('[data-testid=save-thresholds]').click();
    cy.wait('@save').its('request.body.failureThreshold').should('eq', 3);
    cy.contains('Saved thresholds for Example.');
  });
});
