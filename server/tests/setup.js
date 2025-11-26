jest.setTimeout(30000);

jest.mock('nodemailer', () => ({
  createTransport: () => ({
    sendMail: jest.fn().mockResolvedValue(true)
  })
}));




