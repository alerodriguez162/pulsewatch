describe('endpoint form', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'empty-dashboard.json' });
  });

  it('blocks submit until the URL is a public http address', () => {
    cy.visit('/endpoints/new');
    cy.get('[data-testid=save-endpoint]').click();
    cy.get('[data-testid=url-error]').should('contain', 'URL is required.');

    cy.get('[data-testid=endpoint-url]').type('http://127.0.0.1/admin');
    cy.get('[data-testid=save-endpoint]').click();
    cy.get('[data-testid=url-error]').should('contain', 'Private and local addresses are blocked.');
    cy.location('pathname').should('eq', '/endpoints/new');
  });
});

describe('endpoint changes', () => {
  beforeEach(() => {
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard.json' }).as('dashboard');
  });

  it('edits an endpoint name', () => {
    cy.intercept('GET', '/api/endpoints/ep-up', { fixture: 'endpoint.json' }).as('endpoint');
    cy.visit('/endpoints/ep-up');
    cy.wait('@endpoint');
    cy.get('[data-testid=endpoint-name]').clear().type('Example renamed');
    cy.intercept('PATCH', '/api/endpoints/ep-up', { statusCode: 200, body: {} }).as('save');
    cy.get('[data-testid=save-endpoint]').click();
    cy.wait('@save').its('request.body.name').should('eq', 'Example renamed');
    cy.location('pathname').should('eq', '/endpoints');
  });

  it('deletes an endpoint after confirmation', () => {
    cy.visit('/endpoints');
    cy.wait('@dashboard');
    cy.contains('[data-testid=endpoint-row]', 'Example').find('[data-testid=delete-endpoint]').click();
    cy.intercept('DELETE', '/api/endpoints/ep-up', { statusCode: 204 }).as('remove');
    cy.intercept('GET', '/api/dashboard', { fixture: 'dashboard-one.json' }).as('afterDelete');
    cy.contains('[data-testid=endpoint-row]', 'Example').find('[data-testid=confirm-delete]').click();
    cy.wait('@remove');
    cy.wait('@afterDelete');
    cy.contains('[data-testid=endpoint-row]', 'Example').should('not.exist');
    cy.contains('[data-testid=endpoint-row]', 'Billing');
  });
});
