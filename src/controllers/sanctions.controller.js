const sanctionsService = require('../services/sanctions.service');

async function liftSanction(req, res) {
  res.json(
    await sanctionsService.liftSanction(
      req.valid.params.sanctionId,
      req.user.id,
    ),
  );
}

module.exports = {
  liftSanction,
};
